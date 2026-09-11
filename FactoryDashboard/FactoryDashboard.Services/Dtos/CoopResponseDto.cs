namespace FactoryDashboard.Services.Dtos
{
    /// <summary>
    /// Coop entity'sini JSON'a serialize ederken Flocks navigation property'sini
    /// içermez — döngüsel referans (Coop ↔ Flock ↔ Coop) riskini ortadan kaldırır.
    /// </summary>
    public class CoopResponseDto
    {
        public string CoopId { get; set; } = string.Empty;
        public string CoopName { get; set; } = string.Empty;
        public string? Location { get; set; }
        public int Capacity { get; set; }
        public int CurrentCount { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? ResponsibleUserId { get; set; }
        public double? WaterCapacityLiters { get; set; }
        public double? FeedCapacityKg { get; set; }
    }
}
