using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;


namespace FactoryDashboard.DataAccess.Repositories
{
    public class CoopRepository : ICoopRepository
    {
        private readonly FactoryDashboardContext _context;

        public CoopRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<Coop> GetAllCoops()
        {
            return _context.Coops.ToList();
        }

        public Coop? GetCoopById(string coopId)
        {
            return _context.Coops.FirstOrDefault(c => c.CoopId == coopId);
        }

        public void AddCoop(Coop coop)
        {
            _context.Coops.Add(coop);
            _context.SaveChanges();
        }

        public void UpdateCoop(Coop coop)
        {
            _context.Coops.Update(coop);
            _context.SaveChanges();
        }
    }
}
