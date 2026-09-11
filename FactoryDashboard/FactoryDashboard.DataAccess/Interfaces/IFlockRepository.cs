using FactoryDashboard.Entities;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface IFlockRepository
    {
        List<Flock> GetAllFlocks();
        Flock? GetFlockById(int flockId);
        List<Flock> GetFlocksByCoopId(string coopId);
        Flock? GetActiveFlockByCoopId(string coopId);
        void AddFlock(Flock flock);
        void UpdateFlock(Flock flock);

        // FlockLoss audit trail
        void AddFlockLoss(FlockLoss loss);
        List<FlockLoss> GetLossesByFlockId(int flockId);
    }
}
