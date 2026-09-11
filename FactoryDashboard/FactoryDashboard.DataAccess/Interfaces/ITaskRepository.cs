using FactoryDashboard.Entities;
using System.Collections.Generic;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface ITaskRepository
    {
        List<Entities.Task> GetAllTasks();
        List<Entities.Task> GetTasksByUser(string userId);
        Entities.Task? GetTaskById(int taskId);
        void AddTask(Entities.Task task);
        void UpdateTask(Entities.Task task);
        Entities.Task? GetPendingTaskBySensorId(string sensorId); //Görevin tekrarlanmamasını önlemek için sensör kimliğine göre bekleyen görevi al
    }
}