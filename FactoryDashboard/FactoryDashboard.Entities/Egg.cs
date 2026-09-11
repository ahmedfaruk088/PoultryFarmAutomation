using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace FactoryDashboard.Entities
{
    [Table("EggProduction")]
    public class Egg
    {
        [Key]
        public int RecordId { get; set; }
        public required string CoopId { get; set; }
        public DateOnly Date { get; set; }
        public int TotalEggs { get; set; }
        public int BrokenEggs { get; set; }
    }
}