using FactoryDashboard.Entities;
using System.Collections.Generic;

namespace FactoryDashboard.Services
{
    public interface INotificationService
    {
        Notification CreateNotification(string userId, string message, string type,
            string? senderUserId = null, int? relatedTaskId = null, int? parentNotificationId = null);
        List<Notification> GetUserNotifications(string userId);
        bool MarkAsRead(int notificationId);
    }
}