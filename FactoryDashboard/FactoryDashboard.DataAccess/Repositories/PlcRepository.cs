using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FactoryDashboard.DataAccess.Interfaces;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class PlcRepository : IPlcRepository
    {
        private readonly FactoryDashboardContext _context;
        public PlcRepository(FactoryDashboardContext context)
        {
            _context = context;
        }
        public List<PlcDevice> GetAllPlcDevices()
        {
            return _context.PlcDevices.ToList();
        }
        public PlcDevice? GetPlcById(string plcId)
        {
            return _context.PlcDevices.FirstOrDefault(p => p.PlcId == plcId);
        }
        public List<PlcDevice> GetByCoopId(string coopId)
        {
            return _context.PlcDevices
                           .Where(p => p.CoopId == coopId)
                           .ToList();
        }
        public void AddPlcDevice(PlcDevice plc)
        {
            _context.PlcDevices.Add(plc);
            _context.SaveChanges();
        }
        public void UpdatePlcDevice(PlcDevice plc)
        {
            _context.PlcDevices.Update(plc);
            _context.SaveChanges();
        }
        public void DeletePlcDevice(string plcId)
        {
            var plc = _context.PlcDevices.FirstOrDefault(p => p.PlcId == plcId);
            if (plc != null)
            {
                _context.PlcDevices.Remove(plc);
                _context.SaveChanges();
            }
        }
        public void UpdateLastConnected(string plcId, DateTime connectedAt)
        {
            var plc = _context.PlcDevices.FirstOrDefault(p => p.PlcId == plcId);
            if (plc != null)
            {
                plc.LastConnectedAt = connectedAt;
                plc.IsActive = true;
                _context.SaveChanges();
            }
        }
    }
}
