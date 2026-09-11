using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using System;
using System.Collections.Generic;

namespace FactoryDashboard.Services
{
    public class NotificationService : INotificationService
    {
        private readonly INotificationRepository _notificationRepository;

        public NotificationService(INotificationRepository notificationRepository)
        {
            _notificationRepository = notificationRepository;
        }

        public Notification CreateNotification(string userId, string message, string type,
            string? senderUserId = null, int? relatedTaskId = null, int? parentNotificationId = null)
        {
            var notification = new Notification
            {
                UserId = userId,
                Message = message,
                Type = type,
                CreatedAt = DateTime.Now,
                IsRead = false,
                SenderUserId = senderUserId,
                RelatedTaskId = relatedTaskId,
                ParentNotificationId = parentNotificationId
            };

            _notificationRepository.AddNotification(notification);
            return notification;
        }

        public List<Notification> GetUserNotifications(string userId)
        {
            return _notificationRepository.GetNotificationsByUserId(userId);
        }

        public bool MarkAsRead(int notificationId)
        {
            var notification = _notificationRepository.GetNotificationById(notificationId);
            if (notification == null) return false;

            notification.IsRead = true; // Bildirimi okundu olarak işaretle
            _notificationRepository.UpdateNotification(notification);
            return true;
        }
    }
}