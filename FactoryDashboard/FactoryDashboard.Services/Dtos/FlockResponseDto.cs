namespace FactoryDashboard.Services.Dtos
{
    /// <summary>
    /// Flock entity'sini JSON'a serialize ederken Coop navigation property'sini
    /// içermez — döngüsel referans (Flock ↔ Coop ↔ Flock) riskini ortadan kaldırır.
    /// </summary>
    public class FlockResponseDto
    {
        public int FlockId { get; set; }
        public string CoopId { get; set; } = string.Empty;
        public string Breed { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public int InitialCount { get; set; }
        public int CurrentCount { get; set; }
    }
}
