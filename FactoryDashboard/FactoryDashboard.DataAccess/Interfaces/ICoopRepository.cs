using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface ICoopRepository
    {
        List<Coop> GetAllCoops();
        Coop? GetCoopById(string coopId);
        void AddCoop(Coop coop);
        void UpdateCoop(Coop coop);
    }
}
