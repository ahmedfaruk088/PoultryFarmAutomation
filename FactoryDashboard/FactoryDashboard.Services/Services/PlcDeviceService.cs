using FactoryDashboard.DataAccess;
using FactoryDashboard.Entities;
using Microsoft.EntityFrameworkCore;

namespace FactoryDashboard.Services
{
    public class PlcDeviceService : IPlcDeviceService
    {
        private readonly FactoryDashboardContext _context;

        public PlcDeviceService(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<PlcDevice> GetAll()
        {
            return _context.PlcDevices.ToList();
        }

        public PlcDevice? GetById(string plcId)
        {
            return _context.PlcDevices.FirstOrDefault(p => p.PlcId == plcId);
        }

        public PlcDevice AddDevice(PlcDevice device)
        {
            _context.PlcDevices.Add(device);
            _context.SaveChanges();
            return device;
        }

        public PlcDevice? UpdateDevice(string plcId, PlcDevice updated)
        {
            var existing = GetById(plcId);
            if (existing == null) return null;

            existing.Name = updated.Name;
            existing.IpAddress = updated.IpAddress;
            existing.Rack = updated.Rack;
            existing.Slot = updated.Slot;
            existing.CpuType = updated.CpuType;
            existing.CoopId = updated.CoopId;
            existing.IsActive = updated.IsActive;

            _context.SaveChanges();
            return existing;
        }

        public bool DeleteDevice(string plcId)
        {
            var device = GetById(plcId);
            if (device == null) return false;

            _context.PlcDevices.Remove(device);
            _context.SaveChanges();
            return true;
        }

        public Sensor? AssignSensorToPlc(string sensorId, string plcId, int dbNumber, int startByte, string dataType)
        {
            var sensor = _context.Sensors.FirstOrDefault(s => s.SensorId == sensorId);
            if (sensor == null) return null;

            sensor.PlcId = plcId;
            sensor.PlcDbNumber = dbNumber;
            sensor.PlcStartByte = startByte;
            sensor.PlcDataType = dataType;

            _context.SaveChanges();
            return sensor;
        }
    }
}