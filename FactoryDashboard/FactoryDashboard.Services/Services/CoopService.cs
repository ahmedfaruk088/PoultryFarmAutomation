using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;

namespace FactoryDashboard.Services
{
    public class CoopService : ICoopService
    {
        private readonly ICoopRepository _coopRepository;

        public CoopService(ICoopRepository coopRepository)
        {
            _coopRepository = coopRepository;
        }

        public List<Coop> GetAllCoops()
        {
            return _coopRepository.GetAllCoops();
        }

        public Coop? GetCoopById(string coopId)
        {
            return _coopRepository.GetCoopById(coopId);
        }
    }
}