using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly FactoryDashboardContext _context;
        public UserRepository(FactoryDashboardContext context)
        {
            _context = context;
        }
        public List<User> GetAllUsers()
        {
            return _context.Users.ToList();
        }
        public User? GetUserById(string userId)
        {
            return _context.Users.FirstOrDefault(u => u.UserId == userId);
        }
        public void AddUser(User user)
        {
            _context.Users.Add(user);
            _context.SaveChanges();
        }
        public void UpdateUser(User user)
        {
            _context.Users.Update(user);
            _context.SaveChanges();
        }
    }
}