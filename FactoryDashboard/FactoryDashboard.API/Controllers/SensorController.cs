using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SensorController : ControllerBase
    {
        private readonly ISensorRepository _sensorRepository;
        private readonly ISensorLogRepository _sensorLogRepository;
        private static readonly Random _rnd = new();

        public SensorController(ISensorRepository sensorRepository, ISensorLogRepository sensorLogRepository)
        {
            _sensorRepository = sensorRepository;
            _sensorLogRepository = sensorLogRepository;
        }

        [HttpGet]
        public IActionResult GetAllSensors()
        {
            var sensors = _sensorRepository.GetAllSensors();
            if (sensors == null)
            {
                return NotFound("Sensör verisi bulunamadı.");
            }
            return Ok(sensors);
        }

        [HttpGet("coop/{coopId}")]
        public IActionResult GetSensorsByCoop(string coopId)
        {
            var sensors = _sensorRepository.GetByCoopId(coopId);
            return Ok(sensors);
        }

        [HttpGet("live")]
        public IActionResult GetLiveReadings()
        {
            var sensors = _sensorRepository.GetAllSensors();
            var latestLogs = _sensorLogRepository.GetLatestLogsForAllSensors();

            var result = sensors.Select(s =>
            {
                var log = latestLogs.FirstOrDefault(l => l.SensorId == s.SensorId);
                return new
                {
                    s.SensorId,
                    s.SensorName,
                    s.Type,
                    s.Unit,
                    s.CoopId,
                    s.minThreshold,
                    s.maxThreshold,
                    Value = log != null ? log.ReadingValue : Math.Round((s.minThreshold + s.maxThreshold) / 2.0, 1),
                    IsNormal = log?.IsNormal ?? true,
                    ReadAt = log?.ReadAt
                };
            });

            return Ok(result);
        }

        [HttpGet("{sensorId}/history")]
        public IActionResult GetSensorHistory(string sensorId, [FromQuery] DateTime? start, [FromQuery] DateTime? end)
        {
            var query = _sensorLogRepository.GetLogsBySensorId(sensorId).AsQueryable();

            if (start.HasValue)
            {
                // Frontend toISOString() ile UTC gönderir; .NET bunu Unspecified olarak alır.
                // Açıkça UTC olarak işaretle, sonra local'e çevir (DB local saklıyorsa).
                var startUtc = DateTime.SpecifyKind(start.Value, DateTimeKind.Utc);
                var startLocal = startUtc.ToLocalTime();
                query = query.Where(l => l.ReadAt >= startLocal);
            }

            if (end.HasValue)
            {
                var endUtc = DateTime.SpecifyKind(end.Value, DateTimeKind.Utc);
                var endLocal = endUtc.ToLocalTime();
                query = query.Where(l => l.ReadAt <= endLocal);
            }

            // Tarih aralığı verilmediyse eski davranış: son 20 kayıt
            if (!start.HasValue && !end.HasValue)
                query = query.OrderByDescending(l => l.ReadAt).Take(20);

            var logs = query
                .OrderBy(l => l.ReadAt)
                .Select(l => new
                {
                    l.ReadAt,
                    l.ReadingValue,
                    l.IsNormal
                });

            return Ok(logs);
        }
        [HttpGet("{sensorId}/alarm-history")]
        public IActionResult GetAlarmHistory(string sensorId)
        {
            var logs = _sensorLogRepository.GetLogsBySensorId(sensorId)
                .Where(l => !l.IsNormal)
                .OrderByDescending(l => l.ReadAt)
                .Take(20)
                .Select(l => new { l.ReadAt, l.ReadingValue });

            return Ok(new
            {
                TotalAlarmCount = _sensorLogRepository.GetLogsBySensorId(sensorId).Count(l => !l.IsNormal),
                RecentAlarms = logs
            });
        }
        public class UpdatePositionRequest
        {
            public double PositionX { get; set; }
            public double PositionY { get; set; }
        }

        [HttpPut("{sensorId}/position")]
        public IActionResult UpdatePosition(string sensorId, [FromBody] UpdatePositionRequest request)
        {
            var sensor = _sensorRepository.GetSensorById(sensorId);
            if (sensor == null) return NotFound("Sensör bulunamadı.");

            sensor.PositionX = request.PositionX;
            sensor.PositionY = request.PositionY;
            _sensorRepository.UpdateSensor(sensor);

            return Ok(sensor);
        }
        public class CreateSensorRequest
        {
            public required string CoopId { get; set; }
            public required string Type { get; set; }
            public required string Unit { get; set; }
            public double MinThreshold { get; set; }
            public double MaxThreshold { get; set; }
            public double PositionX { get; set; }
            public double PositionY { get; set; }
        }

        [HttpPost]
        public IActionResult AddSensor([FromBody] CreateSensorRequest request)
        {
            var typeSlug = new string(request.Type
           .ToLowerInvariant()
           .Replace("ı", "i").Replace("ğ", "g").Replace("ü", "u")
           .Replace("ş", "s").Replace("ö", "o").Replace("ç", "c")
           .Where(c => char.IsLetterOrDigit(c))
           .Take(4)
           .ToArray());

            // Aynı slug'dan kaç tane var — silinmiş olanlar dahil tüm zamanlar için GUID ile benzersizlik sağla
            string sensorId = $"{request.CoopId}-{typeSlug}-{Guid.NewGuid().ToString("N")[..6]}";

            var sensor = new Sensor
            {
                SensorId = sensorId,
                SensorName = $"{request.Type} Sensörü",
                Type = request.Type,
                Unit = request.Unit,
                minThreshold = request.MinThreshold,
                maxThreshold = request.MaxThreshold,
                CoopId = request.CoopId,
                PositionX = request.PositionX,
                PositionY = request.PositionY
            };

            _sensorRepository.AddSensor(sensor);
            return Ok(sensor);
        }
        [HttpDelete("{sensorId}")]
        public IActionResult DeleteSensor(string sensorId)
        {
            var sensor = _sensorRepository.GetSensorById(sensorId);
            if (sensor == null)
                return NotFound($"'{sensorId}' ID'li sensör bulunamadı.");

            _sensorRepository.DeleteSensor(sensorId);
            return Ok(new { message = $"Sensör '{sensorId}' başarıyla silindi." });
        }
    }
}