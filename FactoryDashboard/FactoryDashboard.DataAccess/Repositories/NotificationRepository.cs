using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using System.Collections.Generic;
using System.Linq;

namespace FactoryDashboard.DataAccess.Repositories
{
    public class NotificationRepository : INotificationRepository
    {
        private readonly FactoryDashboardContext _context;

        public NotificationRepository(FactoryDashboardContext context)
        {
            _context = context;
        }

        public void AddNotification(Notification notification)
        {
            _context.Notifications.Add(notification);
            _context.SaveChanges();
        }

        public List<Notification> GetNotificationsByUserId(string userId)
        {
            // En yeni bildirim en üstte gelsin diye OrderByDescending kullanıyoruz
            return _context.Notifications
                .Where(n => n.UserId == userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToList();
        }

        public Notification? GetNotificationById(int notificationId)
        {
            return _context.Notifications.FirstOrDefault(n => n.NotificationId == notificationId);
        }

        public void UpdateNotification(Notification notification)
        {
            _context.Notifications.Update(notification);
            _context.SaveChanges();
        }
        public List<Notification> GetThreadById(int rootId)
        { 
            return _context.Notifications
                .Where(n => n.NotificationId == rootId || n.ParentNotificationId == rootId)
                .OrderBy(n => n.CreatedAt)
                .ToList();
        }
    }
}