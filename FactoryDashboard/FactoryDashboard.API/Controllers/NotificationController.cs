using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Services;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotificationController : ControllerBase
    {
        private readonly INotificationService _notificationService;
        private readonly IUserRepository _userRepository;
        private readonly INotificationRepository _notificationRepository;

        public NotificationController(
            INotificationService notificationService,
            IUserRepository userRepository,
            INotificationRepository notificationRepository)
        {
            _notificationService = notificationService;
            _userRepository = userRepository;
            _notificationRepository = notificationRepository;
        }

        [HttpPost]
        public IActionResult CreateNotification([FromBody] CreateNotificationRequest request)
        {
            var notification = _notificationService.CreateNotification(
                request.UserId,
                request.Message,
                request.Type,
                senderUserId: request.SenderUserId,
                relatedTaskId: request.RelatedTaskId
            );
            return Ok(notification);
        }

        [HttpGet("user/{userId}")]
        public IActionResult GetUserNotifications(string userId)
        {
            var notifications = _notificationService.GetUserNotifications(userId);
            return Ok(notifications);
        }

        [HttpPut("{notificationId}/read")]
        public IActionResult MarkAsRead(int notificationId)
        {
            var success = _notificationService.MarkAsRead(notificationId);
            if (!success) return NotFound("Bildirim bulunamadı.");
            return Ok(new { message = "Bildirim okundu olarak işaretlendi." });
        }

        [HttpGet("inbox/{userId}")]
        public IActionResult GetInbox(string userId)
        {
            var notifications = _notificationRepository
                .GetNotificationsByUserId(userId)
                .OrderByDescending(n => n.CreatedAt)
                .ToList();

            var users = _userRepository.GetAllUsers();

            var result = notifications.Select(n =>
            {
                var sender = n.SenderUserId != null
                    ? users.FirstOrDefault(u => u.UserId == n.SenderUserId)
                    : null;

                return new
                {
                    n.NotificationId,
                    n.UserId,
                    n.Message,
                    n.Type,
                    n.CreatedAt,
                    n.IsRead,
                    n.SenderUserId,
                    n.RelatedTaskId,
                    n.ParentNotificationId,
                    SenderFirstName = sender?.FirstName,
                    SenderLastName = sender?.LastName,
                    SenderRole = sender?.Role,
                };
            });

            return Ok(result);
        }

        // GÜNCELLENDİ: Yanıtlar artık doğrudan "kök" (ilk) mesaja bağlanıyor
        [HttpPost("{id}/reply")]
        public IActionResult Reply(int id, [FromBody] ReplyRequest request)
        {
            var original = _notificationRepository.GetNotificationById(id);
            if (original == null) return NotFound("Bildirim bulunamadı.");

            // Orijinal mesaj zaten bir yanıtsa, onun parent'ını al (zinciri koparma)
            var rootId = original.ParentNotificationId ?? original.NotificationId;

            var reply = _notificationService.CreateNotification(
                userId: original.SenderUserId ?? original.UserId,
                message: request.Message,
                type: "Yanit",
                senderUserId: original.UserId,
                parentNotificationId: rootId // Tüm yanıtlar aynı Root ID altında toplanır
            );

            return Ok(reply);
        }

        // YENİ EKLENDİ: Konuşma zincirini getiren WhatsApp tarzı endpoint
        [HttpGet("thread/{notificationId}")]
        public IActionResult GetThread(int notificationId, [FromQuery] string currentUserId)
        {
            var original = _notificationRepository.GetNotificationById(notificationId);
            if (original == null) return NotFound("Bildirim bulunamadı.");

            var rootId = original.ParentNotificationId ?? original.NotificationId;
            var threadMessages = _notificationRepository.GetThreadById(rootId);
            var users = _userRepository.GetAllUsers();

            var result = threadMessages.Select(n =>
            {
                var sender = n.SenderUserId != null
                    ? users.FirstOrDefault(u => u.UserId == n.SenderUserId)
                    : null;

                return new
                {
                    n.NotificationId,
                    n.UserId,
                    n.Message,
                    n.Type,
                    n.CreatedAt,
                    n.IsRead,
                    n.SenderUserId,
                    n.ParentNotificationId,
                    SenderFirstName = sender?.FirstName,
                    SenderLastName = sender?.LastName,
                    SenderRole = sender?.Role,
                    IsMine = (n.SenderUserId == currentUserId) // Frontend için sağ/sol hizalama bayrağı
                };
            });

            return Ok(result);
        }

        // ── Request modelleri ──────────────────────────────────────────────
        public class CreateNotificationRequest
        {
            public required string UserId { get; set; }
            public required string Message { get; set; }
            public required string Type { get; set; }
            public string? SenderUserId { get; set; }
            public int? RelatedTaskId { get; set; }
        }

        public class ReplyRequest
        {
            public required string Message { get; set; }
        }
    }
}