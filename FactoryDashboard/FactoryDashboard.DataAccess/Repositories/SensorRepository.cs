using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class SensorRepository : ISensorRepository
    {
        private readonly FactoryDashboardContext _context;

        public SensorRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<Sensor> GetAllSensors()
        {
            return _context.Sensors.ToList();
        }

        public Sensor? GetSensorById(string sensorId)
        {
            return _context.Sensors.FirstOrDefault(s => s.SensorId == sensorId);
        }

        public void AddSensor(Sensor sensor)
        {
            _context.Sensors.Add(sensor);
            _context.SaveChanges();
        }

        public List<Sensor> GetByCoopId(string coopId)
        {
            return _context.Sensors
                           .Where(s => s.CoopId == coopId)
                           .ToList();
        }

        public void UpdateSensor(Sensor sensor)
        {
            _context.Sensors.Update(sensor);
            _context.SaveChanges();
        }

        public void DeleteSensor(string sensorId)
        {
            // 1. Önce bu sensöre bağlı olan log kayıtlarını temizliyoruz
            var relatedLogs = _context.SensorLogs.Where(l => l.SensorId == sensorId);
            if (relatedLogs.Any())
            {
                _context.SensorLogs.RemoveRange(relatedLogs);
            }

            // 2. Sensöre atanmış görevler (Tasks) varsa onları da temizliyoruz
            var relatedTasks = _context.Tasks.Where(t => t.SensorId == sensorId);
            if (relatedTasks.Any())
            {
                _context.Tasks.RemoveRange(relatedTasks);
            }

            // KRİTİK NOKTA: Önce alt tablolardaki silme işlemlerini veritabanına kesin olarak yansıtıyoruz!
            _context.SaveChanges();

            // 3. Alt veriler fiziksel olarak silindiği için artık ana sensörü (Yem Silosu vb.) güvenle silebiliriz
            var sensor = _context.Sensors.FirstOrDefault(s => s.SensorId == sensorId);
            if (sensor != null)
            {
                _context.Sensors.Remove(sensor);
                _context.SaveChanges();
            }
        }
    }
}