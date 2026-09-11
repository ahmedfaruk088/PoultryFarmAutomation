using FactoryDashboard.Services.Hubs;
using FactoryDashboard.DataAccess;
using FactoryDashboard.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Linq;
using System.Threading;

namespace FactoryDashboard.Services
{
    public class SensorSimulatorService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IHubContext<SensorHub> _hubContext;
        private static readonly Random _rnd = new();

        private static readonly string[] ConsumableTypes = { "Su Seviyesi", "Yem Seviyesi" };

        // Döngünün ne sıklıkla çalıştığı - en alttaki Task.Delay ile aynı değeri kullanıyor.
        // Tüketim hesaplaması buna göre orantılanıyor, ikisi asla birbirinden kopmasın diye tek yerde tutuluyor.
        private const int TickIntervalSeconds = 10;
        private const double TicksPerDay = 86400.0 / TickIntervalSeconds;

        public SensorSimulatorService(IServiceProvider serviceProvider, IHubContext<SensorHub> hubContext)
        {
            _serviceProvider = serviceProvider;
            _hubContext = hubContext;
        }

        protected override async System.Threading.Tasks.Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                using (var scope = _serviceProvider.CreateScope())
                {
                    var context = scope.ServiceProvider.GetRequiredService<FactoryDashboardContext>();
                    var taskRepository = scope.ServiceProvider.GetRequiredService<DataAccess.Interfaces.ITaskRepository>();
                    var sensors = context.Sensors.ToList();

                    foreach (var sensor in sensors)
                    {
                        // burada eğer sensörün PlcId'si doluysa, bu sensör gerçek bir PLC'ye bağlıdır ve simülasyon yapılmamalıdır.
                        if (!string.IsNullOrEmpty(sensor.PlcId))
                            continue;

                        var lastLog = context.SensorLogs
                            .Where(l => l.SensorId == sensor.SensorId)
                            .OrderByDescending(l => l.ReadAt)
                            .FirstOrDefault();

                        // Yeni sensörde hiç log yoksa minThreshold ile maxThreshold arasında rastgele bir başlangıç değeri kullan
                        double range = sensor.maxThreshold - sensor.minThreshold;
                        double defaultStart = range > 0
                            ? sensor.minThreshold + range * (0.3 + _rnd.NextDouble() * 0.4)  // %30-%70 arasında
                            : sensor.minThreshold;
                        double lastValue = lastLog?.ReadingValue ?? defaultStart;
                        double value;

                        if (ConsumableTypes.Contains(sensor.Type))
                        {
                            var coop = context.Coops.FirstOrDefault(c => c.CoopId == sensor.CoopId);
                            var flock = context.Flocks.FirstOrDefault(f => f.CoopId == sensor.CoopId && f.EndDate == null);
                            int flockCount = flock?.CurrentCount ?? 0;

                            bool isWater = sensor.Type == "Su Seviyesi";
                            double dailyPerBird = isWater ? 0.2 : 0.12;

                            // Günlük tüketimi, döngünün gerçekte kaç kez çalıştığına (TicksPerDay) göre
                            // orantılı düşürüyoruz - artık "her tick bir saatmiş gibi" yanlış varsayımı yok.
                            double realConsumption = (flockCount * dailyPerBird) / TicksPerDay;

                            value = lastValue - realConsumption;
                            value = Math.Max(0, value);
                        }
                        else
                        {
                            double step = range * 0.04;
                            double delta = (_rnd.NextDouble() - 0.5) * 2 * step;
                            value = lastValue + delta;

                            if (sensor.Type != "Sıcaklık")
                            {
                                value = Math.Max(0, value);
                            }
                        }

                        bool isNormal = value >= sensor.minThreshold && value <= sensor.maxThreshold;
                        double roundedValue = Math.Round(value, 1);

                        var log = new SensorLog
                        {
                            SensorId = sensor.SensorId,
                            ReadingValue = roundedValue,
                            ReadAt = DateTime.Now,
                            IsNormal = isNormal
                        };

                        context.SensorLogs.Add(log);

                        // Yeni okunan değeri, o an bağlı olan tüm istemcilere anlık gönder
                        await _hubContext.Clients.All.SendAsync("ReceiveSensorUpdate", new
                        {
                            sensorId = sensor.SensorId,
                            coopId = sensor.CoopId,
                            type = sensor.Type,
                            value = roundedValue,
                            isNormal,
                            readAt = log.ReadAt
                        }, stoppingToken);

                        if (ConsumableTypes.Contains(sensor.Type))
                        {
                            if (value < sensor.minThreshold)
                            {
                                var existingTask = taskRepository.GetPendingTaskBySensorId(sensor.SensorId);
                                if (existingTask == null)
                                {
                                    var newTask = new Entities.Task
                                    {
                                        SensorId = sensor.SensorId,
                                        CoopId = sensor.CoopId,
                                        TaskType = sensor.Type == "Su Seviyesi" ? "SuEkle" : "YemEkle",
                                        Status = "Bekliyor",
                                        CreatedAt = DateTime.Now
                                    };
                                    taskRepository.AddTask(newTask);
                                }
                            }
                            else
                            {
                                var staleTask = taskRepository.GetPendingTaskBySensorId(sensor.SensorId);
                                if (staleTask != null)
                                {
                                    staleTask.Status = "OtomatikDuzeldi";
                                    staleTask.CompletedAt = DateTime.Now;
                                    taskRepository.UpdateTask(staleTask);
                                }
                            }
                        }
                        else if (!isNormal)
                        {
                            // Su/Yem dışı sensörler (Sıcaklık, Nem, CO2, Motor vb.) alarm durumuna geçince
                            // henüz bekleyen bir görev yoksa yeni task oluştur
                            var taskType = sensor.Type switch
                            {
                                "Sıcaklık"            => "SicaklikKontrol",
                                "Nem oranı"           => "CO2Kontrol",
                                "Havalandırma Motoru" => "MotorKontrol",
                                _                     => sensor.Type + "Kontrol"
                            };

                            var existingTask = taskRepository.GetPendingTaskBySensorId(sensor.SensorId);
                            if (existingTask == null)
                            {
                                taskRepository.AddTask(new Entities.Task
                                {
                                    SensorId  = sensor.SensorId,
                                    CoopId    = sensor.CoopId,
                                    TaskType  = taskType,
                                    Status    = "Bekliyor",
                                    CreatedAt = DateTime.Now
                                });
                            }
                        }
                        else
                        {
                            // Sensör normale döndü — bekleyen görevi otomatik kapat
                            var staleTask = taskRepository.GetPendingTaskBySensorId(sensor.SensorId);
                            if (staleTask != null)
                            {
                                staleTask.Status = "OtomatikDuzeldi";
                                staleTask.CompletedAt = DateTime.Now;
                                taskRepository.UpdateTask(staleTask);
                            }
                        }
                    }

                    await context.SaveChangesAsync();

                    var coops = context.Coops.ToList();
                    var today = DateOnly.FromDateTime(DateTime.Now);

                    foreach (var coop in coops)
                    {
                        int eggsThisTick = _rnd.Next(1, 5);
                        int brokenThisTick = 0;

                        for (int i = 0; i < eggsThisTick; i++)
                        {
                            if (_rnd.NextDouble() < 0.03) brokenThisTick++;
                        }

                        var eggRecord = context.EggProductions.FirstOrDefault(e => e.CoopId == coop.CoopId && e.Date == today);
                        if (eggRecord == null)
                        {
                            eggRecord = new Entities.Egg { CoopId = coop.CoopId, Date = today, TotalEggs = 0, BrokenEggs = 0 };
                            context.EggProductions.Add(eggRecord);
                        }

                        eggRecord.TotalEggs += eggsThisTick;
                        eggRecord.BrokenEggs += brokenThisTick;
                    }

                    await context.SaveChangesAsync();
                }

                await System.Threading.Tasks.Task.Delay(TimeSpan.FromSeconds(TickIntervalSeconds), stoppingToken);
            }
        }
    }
}