using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using System.Collections.Generic;
using System.Linq;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class TaskRepository : ITaskRepository
    {
        private readonly FactoryDashboardContext _context;

        public TaskRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        public List<Entities.Task> GetAllTasks()
        {
            return _context.Tasks.OrderByDescending(t => t.CreatedAt).ToList();
        }

        public List<Entities.Task> GetTasksByUser(string userId)
        {
            return _context.Tasks
                .Where(t => t.AssignedUserId == userId && t.Status == "Bekliyor")
                .OrderByDescending(t => t.CreatedAt)
                .ToList();
        }

        public Entities.Task? GetTaskById(int taskId)
        {
            return _context.Tasks.FirstOrDefault(t => t.TaskId == taskId);
        }

        public void AddTask(Entities.Task task)
        {
            _context.Tasks.Add(task);
            _context.SaveChanges();
        }

        public void UpdateTask(Entities.Task task)
        {
            _context.Tasks.Update(task);
            _context.SaveChanges();
        }
        public Entities.Task? GetPendingTaskBySensorId(string sensorId)
        {
            return _context.Tasks.FirstOrDefault(t => t.SensorId == sensorId && t.Status == "Bekliyor");
        }
    }
}