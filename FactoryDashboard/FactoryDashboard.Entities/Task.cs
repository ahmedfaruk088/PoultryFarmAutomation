using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class Task
    {
        [Key]
        public int TaskId { get; set; }
        public required string SensorId { get; set; }
        public required string CoopId { get; set; }
        public required string TaskType { get; set; }
        public string Status { get; set; } = "Bekliyor";
        public string? AssignedUserId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime? CompletedAt { get; set; }
        public string? CompletedByUserId { get; set; }
        public double? AddedAmount { get; set; }
        public string? ResolutionType { get; set; }
        public string? ResolutionNote { get; set; }
    }
}
