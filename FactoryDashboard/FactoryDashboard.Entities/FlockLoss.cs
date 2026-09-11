using System;
using System.ComponentModel.DataAnnotations;

namespace FactoryDashboard.Entities
{
    /// <summary>
    /// Bir sürüye kaydedilen kayıp olayını (audit trail) temsil eder.
    /// Her RecordLoss çağrısı bir FlockLoss satırı oluşturur.
    /// </summary>
    public class FlockLoss
    {
        [Key]
        public int LossId { get; set; }

        public int FlockId { get; set; }

        // Navigation property
        public Flock? Flock { get; set; }

        public int LossCount { get; set; }

        public DateTime RecordedAt { get; set; } = DateTime.Now;
    }
}
