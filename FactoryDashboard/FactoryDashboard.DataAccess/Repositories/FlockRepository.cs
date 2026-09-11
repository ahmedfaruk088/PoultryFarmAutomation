using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class FlockRepository : IFlockRepository
    {
        private readonly FactoryDashboardContext _context;

        public FlockRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        // ── Flock CRUD ────────────────────────────────────────────────────

        public List<Flock> GetAllFlocks()
            => _context.Flocks.ToList();

        public Flock? GetFlockById(int flockId)
            => _context.Flocks.FirstOrDefault(f => f.FlockId == flockId);

        public List<Flock> GetFlocksByCoopId(string coopId)
            => _context.Flocks.Where(f => f.CoopId == coopId).ToList();

        public Flock? GetActiveFlockByCoopId(string coopId)
            => _context.Flocks.FirstOrDefault(f => f.CoopId == coopId && f.EndDate == null);

        /// <summary>
        /// Yeni sürü ekler. Caller (FlockService), DbUpdateException'ı
        /// unique constraint ihlali için kendisi yakalar.
        /// </summary>
        public void AddFlock(Flock flock)
        {
            _context.Flocks.Add(flock);
            _context.SaveChanges();
        }

        public void UpdateFlock(Flock flock)
        {
            _context.Flocks.Update(flock);
            _context.SaveChanges();
        }

        // ── FlockLoss audit trail ─────────────────────────────────────────

        public void AddFlockLoss(FlockLoss loss)
        {
            _context.FlockLosses.Add(loss);
            _context.SaveChanges();
        }

        public List<FlockLoss> GetLossesByFlockId(int flockId)
            => _context.FlockLosses
                .Where(l => l.FlockId == flockId)
                .OrderByDescending(l => l.RecordedAt)
                .ToList();
    }
}
