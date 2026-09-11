using FactoryDashboard.DataAccess;
using FactoryDashboard.Entities;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace FactoryDashboard.Services
{
    /// <summary>
    /// Her 30 saniyede bir çalışarak sensör veri sağlığını izler.
    /// Dört kontrol yapar:
    ///   1. PLC bağlantı sorunu  (PlcId dolu sensörler, PLC bazlı)
    ///   2. Sessiz kalma          (PlcId null sensörler, 60 s eşiği)
    ///   3. Donmuş sensör         (tüm sensörler, stddev &lt; 0.01)
    ///   4. Fiziksel sıçrama      (tüm sensörler, 2 ardışık tick debounce)
    /// </summary>
    public class SensorHealthMonitorService : BackgroundService
    {
        private const int CheckIntervalSeconds = 30;

        // ── Bağlantı eşikleri ────────────────────────────────────────────
        /// <summary>PLC'nin en son bağlandığından bu yana geçebilecek maksimum süre.</summary>
        private static readonly TimeSpan PlcStaleThreshold = TimeSpan.FromSeconds(90);

        /// <summary>PlcId null sensörlerin en son log üretmesinden bu yana geçebilecek maksimum süre.</summary>
        private static readonly TimeSpan SilentThreshold = TimeSpan.FromSeconds(60);

        // ── Donmuş sensör ────────────────────────────────────────────────
        private const double FrozenStdDevThreshold = 0.01;
        private const int FrozenSampleCount = 10;

        // ── Sıçrama debounce ─────────────────────────────────────────────
        /// <summary>Sıçrama olarak nitelendirmek için eşik katsayısı: aralığın %50'si.</summary>
        private const double SpikeRatio = 0.50;

        // ────────────────────────────────────────────────────────────────
        // Debounce / durum sözlükleri
        //   Anahtar: "{sensorId}:{arızaTipi}"  →  bool (true = zaten bildirildi)
        // ────────────────────────────────────────────────────────────────
        private readonly Dictionary<string, bool> _plcFaultState    = new();  // PLC bağlantı sorunu
        private readonly Dictionary<string, bool> _silentState      = new();  // Sessiz kalma
        private readonly Dictionary<string, bool> _frozenState      = new();  // Donmuş sensör
        private readonly Dictionary<string, bool> _spikeState       = new();  // Sıçrama
        // Sıçrama için bir önceki tick'in durumu (2 ardışık tick gerekir)
        private readonly Dictionary<string, bool> _spikePrevTick    = new();

        private readonly IServiceScopeFactory _scopeFactory;

        public SensorHealthMonitorService(IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
        }

        protected override async System.Threading.Tasks.Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Uygulama ilk açılırken PlcService'in başlamasına biraz zaman tanı
            await System.Threading.Tasks.Task.Delay(TimeSpan.FromSeconds(15), stoppingToken);

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await RunChecksAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss}] [SensorHealth] Beklenmedik hata: {ex.Message}");
                }

                await System.Threading.Tasks.Task.Delay(
                    TimeSpan.FromSeconds(CheckIntervalSeconds), stoppingToken);
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ANA KONTROL DÖNGÜSÜ
        // ══════════════════════════════════════════════════════════════════
        private async System.Threading.Tasks.Task RunChecksAsync(CancellationToken stoppingToken)
        {
            using var scope = _scopeFactory.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<FactoryDashboardContext>();

            var now = DateTime.Now;
            var allSensors = context.Sensors.ToList();

            // Admin kullanıcıları bir kez çek — tüm bildirimler bunlara gidecek
            var admins = context.Users
                .Where(u => u.Role == "admin")
                .ToList();

            // ── KONTROL 1: PLC Bağlantı Sorunu ──────────────────────────
            // Sadece PlcId dolu sensörler → PLC cihazı bazlı değerlendir
            var plcSensorMap = allSensors
                .Where(s => !string.IsNullOrEmpty(s.PlcId))
                .GroupBy(s => s.PlcId!)
                .ToDictionary(g => g.Key, g => g.ToList());

            var activePlcs = context.PlcDevices
                .Where(p => p.IsActive)
                .ToList();

            // PLC sorunlu olan PlcId'leri işaretle — bu sensörler Kontrol 2'den muaf tutulacak
            var problematicPlcIds = new HashSet<string>();

            foreach (var plcDevice in activePlcs)
            {
                bool plcHasProblem =
                    !plcDevice.IsConnected ||
                    plcDevice.LastConnectedAt == null ||
                    (now - plcDevice.LastConnectedAt.Value) > PlcStaleThreshold;

                string stateKey = plcDevice.PlcId;
                bool wasReported = _plcFaultState.TryGetValue(stateKey, out var prev) && prev;

                if (plcHasProblem)
                {
                    problematicPlcIds.Add(plcDevice.PlcId);

                    // Rising edge → yalnızca ilk kez raporla
                    if (!wasReported)
                    {
                        int affectedCount = plcSensorMap.TryGetValue(plcDevice.PlcId, out var plcSensors)
                            ? plcSensors.Count
                            : 0;

                        string message =
                            $"{plcDevice.Name} PLC'sine bağlanılamıyor, " +
                            $"buna bağlı {affectedCount} sensör veri üretmiyor.";

                        await CreateNotificationsAsync(context, admins, message, "PlcBaglantiSorunu");

                        Console.WriteLine(
                            $"[{now:HH:mm:ss}] [SensorHealth] PLC bağlantı sorunu: {plcDevice.Name} " +
                            $"(IsConnected={plcDevice.IsConnected}, " +
                            $"LastConnectedAt={plcDevice.LastConnectedAt:HH:mm:ss})");
                    }

                    _plcFaultState[stateKey] = true;
                }
                else
                {
                    // Falling edge → durumu sıfırla
                    if (wasReported)
                        Console.WriteLine($"[{now:HH:mm:ss}] [SensorHealth] PLC bağlantısı düzeldi: {plcDevice.Name}");

                    _plcFaultState[stateKey] = false;
                }
            }

            // ── KONTROL 2, 3, 4: Sensör bazlı kontroller ────────────────
            foreach (var sensor in allSensors)
            {
                bool isPlcSensor = !string.IsNullOrEmpty(sensor.PlcId);

                // ── KONTROL 2: Sessiz Kalma (sadece PlcId null sensörler) ─
                if (!isPlcSensor)
                {
                    await CheckSilentAsync(context, admins, sensor, now);
                }
                // PlcId dolu ama PLC'si sorunlu olan sensörler için Kontrol 2'yi atla
                // (Kontrol 1 zaten raporladı, çift bildirim olmasın)

                // ── KONTROL 3: Donmuş Sensör (tüm sensörler) ─────────────
                // PLC'si sorunlu sensörleri donmuş kontrol'dan muaf tut —
                // PLC yok olunca zaten veri gelmiyor, bunu "donmuş" saymak yanlış olur.
                if (!(isPlcSensor && problematicPlcIds.Contains(sensor.PlcId!)))
                {
                    await CheckFrozenAsync(context, admins, sensor, now);
                }

                // ── KONTROL 4: Fiziksel Sıçrama (tüm sensörler) ──────────
                if (!(isPlcSensor && problematicPlcIds.Contains(sensor.PlcId!)))
                {
                    await CheckSpikeAsync(context, admins, sensor, now);
                }
            }

            // Bildirimleri kaydet
            await context.SaveChangesAsync(stoppingToken);
        }

        // ══════════════════════════════════════════════════════════════════
        // KONTROL 2 — SESSİZ KALMA
        // ══════════════════════════════════════════════════════════════════
        private async System.Threading.Tasks.Task CheckSilentAsync(
            FactoryDashboardContext context,
            List<User> admins,
            Sensor sensor,
            DateTime now)
        {
            var lastLog = context.SensorLogs
                .Where(l => l.SensorId == sensor.SensorId)
                .OrderByDescending(l => l.ReadAt)
                .FirstOrDefault();

            // Hiç kaydı olmayan yeni sensörü atla
            if (lastLog == null || lastLog.ReadAt == null) return;

            bool isSilent = (now - lastLog.ReadAt.Value) > SilentThreshold;
            string stateKey = $"{sensor.SensorId}:silent";
            bool wasReported = _silentState.TryGetValue(stateKey, out var prev) && prev;

            if (isSilent && !wasReported)
            {
                string message =
                    $"{sensor.SensorName} sensöründen {(int)(now - lastLog.ReadAt.Value).TotalSeconds} " +
                    $"saniyedir veri gelmiyor. Sensör veya simülatör servisinde arıza olabilir.";

                await CreateNotificationsAsync(context, admins, message, "SensorArizasi");

                Console.WriteLine(
                    $"[{now:HH:mm:ss}] [SensorHealth] Sessiz sensör: {sensor.SensorName} " +
                    $"(son log: {lastLog.ReadAt:HH:mm:ss})");
            }

            if (!isSilent && wasReported)
                Console.WriteLine($"[{now:HH:mm:ss}] [SensorHealth] Sessiz durum düzeldi: {sensor.SensorName}");

            _silentState[stateKey] = isSilent;
        }

        // ══════════════════════════════════════════════════════════════════
        // KONTROL 3 — DONMUŞ SENSÖR
        // ══════════════════════════════════════════════════════════════════
        private async System.Threading.Tasks.Task CheckFrozenAsync(
            FactoryDashboardContext context,
            List<User> admins,
            Sensor sensor,
            DateTime now)
        {
            var recentLogs = context.SensorLogs
                .Where(l => l.SensorId == sensor.SensorId)
                .OrderByDescending(l => l.ReadAt)
                .Take(FrozenSampleCount)
                .Select(l => l.ReadingValue)
                .ToList();

            // En az 10 kayıt yoksa atla
            if (recentLogs.Count < FrozenSampleCount) return;

            double stdDev = CalculateStdDev(recentLogs);
            bool isFrozen = stdDev < FrozenStdDevThreshold;

            string stateKey = $"{sensor.SensorId}:frozen";
            bool wasReported = _frozenState.TryGetValue(stateKey, out var prev) && prev;

            if (isFrozen && !wasReported)
            {
                string message =
                    $"{sensor.SensorName} sensörü donmuş görünüyor. " +
                    $"Son {FrozenSampleCount} ölçümün standart sapması {stdDev:F4} — " +
                    $"sensör veya okuma devresi arızalı olabilir.";

                await CreateNotificationsAsync(context, admins, message, "SensorArizasi");

                Console.WriteLine(
                    $"[{now:HH:mm:ss}] [SensorHealth] Donmuş sensör: {sensor.SensorName} " +
                    $"(stddev={stdDev:F4})");
            }

            if (!isFrozen && wasReported)
                Console.WriteLine($"[{now:HH:mm:ss}] [SensorHealth] Donmuş durum düzeldi: {sensor.SensorName}");

            _frozenState[stateKey] = isFrozen;
        }

        // ══════════════════════════════════════════════════════════════════
        // KONTROL 4 — FİZİKSEL SIÇRAMA (2 ardışık tick debounce)
        // ══════════════════════════════════════════════════════════════════
        private async System.Threading.Tasks.Task CheckSpikeAsync(
            FactoryDashboardContext context,
            List<User> admins,
            Sensor sensor,
            DateTime now)
        {
            // Son 2 okumayı al
            var lastTwo = context.SensorLogs
                .Where(l => l.SensorId == sensor.SensorId)
                .OrderByDescending(l => l.ReadAt)
                .Take(2)
                .Select(l => l.ReadingValue)
                .ToList();

            if (lastTwo.Count < 2) return;

            double range = sensor.maxThreshold - sensor.minThreshold;
            if (range <= 0) return;

            double diff = Math.Abs(lastTwo[0] - lastTwo[1]);
            bool spikeThisTick = diff > (range * SpikeRatio);

            string stateKey   = $"{sensor.SensorId}:spike";
            string prevKey    = $"{sensor.SensorId}:spikeprev";

            bool wasReported  = _spikeState.TryGetValue(stateKey, out var prev) && prev;
            bool prevTickSpike = _spikePrevTick.TryGetValue(prevKey, out var prevT) && prevT;

            // 2 ardışık tick'te de sıçrama varsa → gerçek arıza
            bool confirmedSpike = spikeThisTick && prevTickSpike;

            if (confirmedSpike && !wasReported)
            {
                string message =
                    $"{sensor.SensorName} sensöründe anormal değer sıçraması tespit edildi. " +
                    $"Ardışık iki ölçüm arasındaki fark {diff:F2} {sensor.Unit} " +
                    $"(ölçüm aralığının {(diff / range * 100):F0}%'i).";

                await CreateNotificationsAsync(context, admins, message, "SensorArizasi");

                Console.WriteLine(
                    $"[{now:HH:mm:ss}] [SensorHealth] Sıçrama: {sensor.SensorName} " +
                    $"(fark={diff:F2}, aralık={range:F2})");
            }

            if (!confirmedSpike && wasReported)
                Console.WriteLine($"[{now:HH:mm:ss}] [SensorHealth] Sıçrama durumu düzeldi: {sensor.SensorName}");

            // Durumları güncelle
            _spikePrevTick[prevKey] = spikeThisTick;
            _spikeState[stateKey]   = confirmedSpike;
        }

        // ══════════════════════════════════════════════════════════════════
        // BİLDİRİM OLUŞTURUCU
        // ══════════════════════════════════════════════════════════════════
        private static async System.Threading.Tasks.Task CreateNotificationsAsync(
            FactoryDashboardContext context,
            List<User> admins,
            string message,
            string type)
        {
            foreach (var admin in admins)
            {
                context.Notifications.Add(new Notification
                {
                    UserId             = admin.UserId,
                    Message            = message,
                    Type               = type,
                    CreatedAt          = DateTime.Now,
                    IsRead             = false,
                    SenderUserId       = "System",
                    RelatedTaskId      = null,
                    ParentNotificationId = null
                });
            }

            // SaveChanges çağrısı dışarıda (RunChecksAsync'in sonunda toplu) yapılıyor,
            // bu metot sadece context'e ekler; bağımsız kaydı gerektiren bir durum için
            // ayrıca SaveChangesAsync çağrılabilir.
            await System.Threading.Tasks.Task.CompletedTask;
        }

        // ══════════════════════════════════════════════════════════════════
        // YARDIMCI: Standart Sapma
        // ══════════════════════════════════════════════════════════════════
        private static double CalculateStdDev(List<double> values)
        {
            if (values.Count < 2) return 0;

            double mean = values.Average();
            double sumSq = values.Sum(v => (v - mean) * (v - mean));
            return Math.Sqrt(sumSq / values.Count);
        }
    }
}
