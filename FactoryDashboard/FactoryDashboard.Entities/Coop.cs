using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

// Coop.cs
namespace FactoryDashboard.Entities
{
    public class Coop
    {
        public required string CoopId { get; set; }
        public required string CoopName { get; set; }
        public string? Location { get; set; }
        public int Capacity { get; set; }
        public int CurrentCount { get; set; }
        public string Status { get; set; } = "active";
        public string? ResponsibleUserId { get; set; }
        public double? WaterCapacityLiters { get; set; }
        public double? FeedCapacityKg { get; set; }

        // Bir coop'un birden fazla (geçmiş + aktif) sürüsü olabilir
        public ICollection<Flock> Flocks { get; set; } = new List<Flock>();
    }
}