using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.Entities
{
    public class Flock
    {
        public int FlockId { get; set; }
        public required string CoopId { get; set; }

        // Navigation property - EF Core CoopId ile Coop.CoopId'yi
        // isim eşleşmesinden otomatik FK olarak tanıyacak
        public Coop? Coop { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int InitialCount { get; set; }
        public int CurrentCount { get; set; }
        public required string Breed { get; set; }

        // Kayıp kayıtları (audit trail)
        public ICollection<FlockLoss> FlockLosses { get; set; } = new List<FlockLoss>();
    }
}