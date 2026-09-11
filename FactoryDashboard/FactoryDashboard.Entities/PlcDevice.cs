using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class PlcDevice
    {
        [Key]
        public required string PlcId { get; set; } 
        public required string Name { get; set; }
        public required string IpAddress { get; set; }
        public int Rack { get; set; }
        public int Slot { get; set; }
        public required string CpuType { get; set; }
        public required string CoopId { get; set; }
        public bool IsActive { get; set; }
        public DateTime? LastConnectedAt { get; set; }
        public bool IsConnected { get; set; } = false;
    }
}
