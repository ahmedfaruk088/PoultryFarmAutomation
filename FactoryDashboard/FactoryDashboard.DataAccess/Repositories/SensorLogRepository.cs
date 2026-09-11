using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FactoryDashboard.Entities;
using FactoryDashboard.DataAccess.Interfaces;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class SensorLogRepository : ISensorLogRepository
    {
        private readonly FactoryDashboardContext _context;

        public SensorLogRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<SensorLog> GetLogsBySensorId(string sensorId)
        {
            return _context.SensorLogs
                .Where(l => l.SensorId == sensorId)
                .OrderByDescending(l => l.ReadAt)
                .ToList();
        }

        public void AddLog(SensorLog log)
        {
            _context.SensorLogs.Add(log);
            _context.SaveChanges();
        }
        public List<SensorLog> GetLatestLogsForAllSensors()
        {
            return _context.SensorLogs
                .GroupBy(l => l.SensorId)
                .Select(g => g.OrderByDescending(l => l.ReadAt).First())
                .ToList();
        }
    }
}
