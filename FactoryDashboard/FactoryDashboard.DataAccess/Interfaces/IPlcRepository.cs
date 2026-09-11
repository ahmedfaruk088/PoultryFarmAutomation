using FactoryDashboard.Entities;
using System.Collections.Generic;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface IPlcRepository
    {
        List<PlcDevice> GetAllPlcDevices();
        PlcDevice? GetPlcById(string plcId);
        List<PlcDevice> GetByCoopId(string coopId);
        void AddPlcDevice(PlcDevice plc);
        void UpdatePlcDevice(PlcDevice plc);
        void DeletePlcDevice(string plcId);
        void UpdateLastConnected(string plcId, System.DateTime connectedAt);
    }
}