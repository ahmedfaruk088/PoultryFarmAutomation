using System;
using System.ComponentModel.DataAnnotations;

namespace FactoryDashboard.Entities
{
    public class Notification
    {
        [Key]
        public int NotificationId { get; set; }

        // Bildirimin kime gideceği
        public required string UserId { get; set; }

        // Mesajın içeriği ("Saat 14:00'te toplantı var", "Depoyu kontrol et" vb.)
        public required string Message { get; set; }

        // Bildirimin türü ("Toplantı", "Görev", "Bilgi")
        public required string Type { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.Now;

        public bool IsRead { get; set; } = false;

        public string? SenderUserId { get; set; }
        public int? RelatedTaskId { get; set; }
        public int? ParentNotificationId { get; set; }
    }
}