using FactoryDashboard.DataAccess;
using FactoryDashboard.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using S7.Net;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using FactoryDashboard.Services.Hubs;

namespace FactoryDashboard.Services
{
    public class PlcService : BackgroundService
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<SensorHub> _hubContext;

        // Histerezis için: sensorId → son alarm durumu (true = alarm aktif)
        private readonly Dictionary<string, bool> _alarmState = new();

        public PlcService(IServiceScopeFactory scopeFactory, IHubContext<SensorHub> hubContext)
        {
            _scopeFactory = scopeFactory;
            _hubContext = hubContext;
        }

        protected override async System.Threading.Tasks.Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var context  = scope.ServiceProvider.GetRequiredService<FactoryDashboardContext>();
                    var taskRepo = scope.ServiceProvider.GetRequiredService<DataAccess.Interfaces.ITaskRepository>();

                    var activePlcs = context.PlcDevices.Where(p => p.IsActive).ToList();

                    foreach (var plcDevice in activePlcs)
                    {
                        if (!Enum.TryParse(plcDevice.CpuType, out CpuType cpuType))
                            continue;

                        using var plc = new Plc(cpuType, plcDevice.IpAddress, (short)plcDevice.Rack, (short)plcDevice.Slot);

                        try
                        {
                            plc.Open();
                            if (!plc.IsConnected)
                            {
                                plcDevice.IsConnected = false;
                                context.SaveChanges();
                                continue;
                            }

                            plcDevice.IsConnected = true;
                            plcDevice.LastConnectedAt = DateTime.Now;

                            var sensors = context.Sensors
                                .Where(s => s.PlcId == plcDevice.PlcId)
                                .ToList();

                            foreach (var sensor in sensors)
                            {
                                if (sensor.PlcDbNumber == null || sensor.PlcStartByte == null || string.IsNullOrEmpty(sensor.PlcDataType))
                                    continue;

                                object? readValue = null;
                                try
                                {
                                    switch (sensor.PlcDataType)
                                    {
                                        case "Bool":
                                            int bitOffset = sensor.PlcBitOffset ?? 0;
                                            var rawByte = plc.Read(DataType.DataBlock, sensor.PlcDbNumber.Value, sensor.PlcStartByte.Value, VarType.Byte, 1);
                                            if (rawByte is byte byteVal)
                                                readValue = (byteVal >> bitOffset) & 1;
                                            break;
                                        case "Real":
                                            readValue = plc.Read(DataType.DataBlock, sensor.PlcDbNumber.Value, sensor.PlcStartByte.Value, VarType.Real, 1);
                                            break;
                                        case "Int":
                                            readValue = plc.Read(DataType.DataBlock, sensor.PlcDbNumber.Value, sensor.PlcStartByte.Value, VarType.Int, 1);
                                            break;
                                        case "Word":
                                            readValue = plc.Read(DataType.DataBlock, sensor.PlcDbNumber.Value, sensor.PlcStartByte.Value, VarType.Word, 1);
                                            break;
                                    }
                                }
                                catch (Exception readEx)
                                {
                                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] Okuma hatası ({sensor.SensorName}): {readEx.Message}");
                                    continue;
                                }

                                if (readValue == null) continue;

                                double numericValue = Math.Round(Convert.ToDouble(readValue), 1);
                                bool isNormal = numericValue >= sensor.minThreshold && numericValue <= sensor.maxThreshold;

                                var log = new SensorLog
                                {
                                    SensorId  = sensor.SensorId,
                                    ReadingValue = numericValue,
                                    ReadAt    = DateTime.Now,
                                    IsNormal  = isNormal
                                };
                                context.SensorLogs.Add(log);

                                // SignalR push
                                await _hubContext.Clients.All.SendAsync("ReceiveSensorUpdate", new
                                {
                                    sensorId = sensor.SensorId,
                                    coopId   = sensor.CoopId,
                                    type     = sensor.Type,
                                    value    = numericValue,
                                    isNormal,
                                    readAt   = log.ReadAt
                                }, stoppingToken);

                                // ── Alarm / görev üretme mantığı ──────────────────────────────
                                TryCreateAlarmTask(context, taskRepo, sensor, numericValue);

                                Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] {plcDevice.Name} → {sensor.SensorName}: {numericValue} {sensor.Unit}");
                            }

                            context.SaveChanges();
                        }
                        catch (Exception ex)
                        {
                            plcDevice.IsConnected = false;
                            context.SaveChanges();
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] PLC bağlantı hatası ({plcDevice.IpAddress}): {ex.Message}");
                        }
                        finally
                        {
                            if (plc.IsConnected) plc.Close();
                        }
                    }
                }

                await System.Threading.Tasks.Task.Delay(1000, stoppingToken);
            }
        }

        // ── Alarm görev üretici ────────────────────────────────────────────
        private void TryCreateAlarmTask(
            FactoryDashboardContext context,
            DataAccess.Interfaces.ITaskRepository taskRepo,
            Sensor sensor,
            double value)
        {
            // Histerezis eşikleri: alarm tetikleme için %10 tampon
            double alarmThreshold   = sensor.maxThreshold;                          // üst sınır
            double clearThreshold   = sensor.maxThreshold * 0.9;                   // alarm temizleme eşiği (%90)
            double lowAlarmThreshold = sensor.minThreshold;                         // alt sınır
            double lowClearThreshold = sensor.minThreshold * 1.1;                  // alt alarm temizleme (%110)

            bool currentlyInAlarm = _alarmState.TryGetValue(sensor.SensorId, out var prev) && prev;

            string? taskType = sensor.Type switch
            {
                "Su Seviyesi"  => "SuEkle",
                "Yem Seviyesi" => "YemEkle",
                "Sıcaklık"     => "SicaklikKontrol",
                "CO2"          => "CO2Kontrol",
                "Havalandırma Motoru" => "MotorKontrol",
                _ => null
            };

            if (taskType == null) return;

            // Motor ve bool sensörler: değer 0 ise arıza (ayrı mantık)
            bool isBoolSensor = sensor.PlcDataType == "Bool";
            bool isAlarmNow;

            if (isBoolSensor)
            {
                // Motor: 0 = arıza, 1 = normal
                isAlarmNow = value == 0;
            }
            else
            {
                // Histerezis: alarm yokken → üst/alt eşiği aştıysa tetikle
                //             alarm varken → temizleme eşiğine dönene kadar devam et
                if (!currentlyInAlarm)
                    isAlarmNow = value > alarmThreshold || value < lowAlarmThreshold;
                else
                    isAlarmNow = value > clearThreshold || value < lowClearThreshold;
            }

            _alarmState[sensor.SensorId] = isAlarmNow;

            // Alarm yeni başladıysa (rising edge) görev oluştur
            if (isAlarmNow && !currentlyInAlarm)
            {
                var existing = taskRepo.GetPendingTaskBySensorId(sensor.SensorId);
                if (existing == null)
                {
                    taskRepo.AddTask(new Entities.Task
                    {
                        SensorId    = sensor.SensorId,
                        CoopId      = sensor.CoopId,
                        TaskType    = taskType,
                        Status      = "Bekliyor",
                        CreatedAt   = DateTime.Now
                    });
                    Console.WriteLine($"[ALARM] {sensor.SensorName} → {taskType} görevi oluşturuldu (değer: {value})");
                }
            }
        }
    }
}
