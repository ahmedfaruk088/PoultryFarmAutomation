using FactoryDashboard.Entities;

namespace FactoryDashboard.Services.Dtos
{
    public static class FlockMappingExtensions
    {
        public static FlockResponseDto ToDto(this Flock flock) => new()
        {
            FlockId      = flock.FlockId,
            CoopId       = flock.CoopId,
            Breed        = flock.Breed,
            StartDate    = flock.StartDate,
            EndDate      = flock.EndDate,
            InitialCount = flock.InitialCount,
            CurrentCount = flock.CurrentCount,
        };

        public static List<FlockResponseDto> ToDtoList(this IEnumerable<Flock> flocks)
            => flocks.Select(f => f.ToDto()).ToList();
    }
}
