using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FactoryDashboard.Entities;


namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface ISensorRepository
    {
        List<Sensor> GetAllSensors();
        Sensor? GetSensorById(string sensorId);
        void AddSensor(Sensor sensor);
        List<Sensor> GetByCoopId(string coopId);
        void UpdateSensor(Sensor sensor);
        void DeleteSensor(string sensorId);
    }
}
