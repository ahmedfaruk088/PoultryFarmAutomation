using FactoryDashboard.Entities;

namespace FactoryDashboard.Services
{
    public interface IPlcDeviceService
    {
        List<PlcDevice> GetAll();
        PlcDevice? GetById(string plcId);
        PlcDevice AddDevice(PlcDevice device);
        PlcDevice? UpdateDevice(string plcId, PlcDevice updated);
        bool DeleteDevice(string plcId);
        Sensor? AssignSensorToPlc(string sensorId, string plcId, int dbNumber, int startByte, string dataType);
    }
}