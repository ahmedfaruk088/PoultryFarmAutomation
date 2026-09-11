using FactoryDashboard.Entities;
using System.Collections.Generic;

namespace FactoryDashboard.DataAccess.Interfaces
{
    public interface INotificationRepository
    {
        void AddNotification(Notification notification);
        List<Notification> GetNotificationsByUserId(string userId);
        Notification? GetNotificationById(int notificationId);
        void UpdateNotification(Notification notification);
        List<Notification> GetThreadById(int rootId);
    }
}