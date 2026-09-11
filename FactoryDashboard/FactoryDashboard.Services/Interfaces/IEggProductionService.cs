using FactoryDashboard.Entities;
using System.ComponentModel.DataAnnotations.Schema;

namespace FactoryDashboard.Services
{
    
    public interface IEggProductionService
    {
        List<Egg> GetByCoopId(string coopId);
        Egg GetOrCreateToday(string coopId);
        void AddEggs(string coopId, int totalToAdd, int brokenToAdd);
    }
}