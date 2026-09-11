using FactoryDashboard.Entities;

namespace FactoryDashboard.Services.Dtos
{
    public static class CoopMappingExtensions
    {
        public static CoopResponseDto ToDto(this Coop coop) => new()
        {
            CoopId               = coop.CoopId,
            CoopName             = coop.CoopName,
            Location             = coop.Location,
            Capacity             = coop.Capacity,
            CurrentCount         = coop.CurrentCount,
            Status               = coop.Status,
            ResponsibleUserId    = coop.ResponsibleUserId,
            WaterCapacityLiters  = coop.WaterCapacityLiters,
            FeedCapacityKg       = coop.FeedCapacityKg,
        };

        public static List<CoopResponseDto> ToDtoList(this IEnumerable<Coop> coops)
            => coops.Select(c => c.ToDto()).ToList();
    }
}
