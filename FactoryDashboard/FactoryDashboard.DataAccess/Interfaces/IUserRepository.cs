using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface IUserRepository
    {
        List<User> GetAllUsers();
        User? GetUserById(string userId);
        void AddUser(User user);
        void UpdateUser(User user);
    }
}
