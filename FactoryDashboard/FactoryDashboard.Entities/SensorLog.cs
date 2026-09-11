using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class SensorLog
    {
        [Key]
        public int LogId { get; set; }
        public string? SensorId { get; set; }
        public double ReadingValue { get; set; }
        public DateTime? ReadAt { get; set; }
        public bool IsNormal { get; set; }
    }
}
