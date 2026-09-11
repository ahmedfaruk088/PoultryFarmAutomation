using FactoryDashboard.Entities;

namespace FactoryDashboard.Services
{
    public interface ICoopService
    {
        List<Coop> GetAllCoops();
        Coop? GetCoopById(string coopId);
    }
}