using FactoryDashboard.DataAccess;
using FactoryDashboard.Entities;
using Microsoft.EntityFrameworkCore;

namespace FactoryDashboard.Services
{
    public class EggProductionService : IEggProductionService
    {
        private readonly FactoryDashboardContext _context;

        public EggProductionService(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<Egg> GetByCoopId(string coopId)
        {
            return _context.EggProductions
                .Where(e => e.CoopId == coopId)
                .OrderByDescending(e => e.Date)
                .ToList();
        }

        public Egg GetOrCreateToday(string coopId)
        {
            var today = DateOnly.FromDateTime(DateTime.Now);
            var record = _context.EggProductions.FirstOrDefault(e => e.CoopId == coopId && e.Date == today);

            if (record == null)
            {
                record = new Egg { CoopId = coopId, Date = today, TotalEggs = 0, BrokenEggs = 0 };
                _context.EggProductions.Add(record);
                _context.SaveChanges();
            }

            return record;
        }

        public void AddEggs(string coopId, int totalToAdd, int brokenToAdd)
        {
            var record = GetOrCreateToday(coopId);
            record.TotalEggs += totalToAdd;
            record.BrokenEggs += brokenToAdd;
            _context.SaveChanges();
        }
    }
}