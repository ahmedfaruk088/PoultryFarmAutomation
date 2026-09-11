using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface ISensorLogRepository
    {
        List<SensorLog> GetLogsBySensorId(string sensorId);
        void AddLog(SensorLog log);
        List<SensorLog> GetLatestLogsForAllSensors();
    }
}
