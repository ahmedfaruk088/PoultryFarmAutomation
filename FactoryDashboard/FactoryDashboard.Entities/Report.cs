using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class Report
    {
        public int ReportId { get; set; }
        public string? UserId { get; set; }
        public string? SensorId { get; set; }
        public string? SensorName { get; set; }
        public string? CoopId { get; set; }
        public string Severity { get; set; } = "Warning";

        public DateTime AlarmTriggeredAt { get; set; }
        public DateTime? ResolvedAt { get; set; }
    }
}