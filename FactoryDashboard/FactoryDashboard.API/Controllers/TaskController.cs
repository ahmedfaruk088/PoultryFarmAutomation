using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using FactoryDashboard.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TaskController : ControllerBase
    {
        // Bütün tanımlamalar en üstte toplandı
        private readonly ITaskRepository _taskRepository;
        private readonly ISensorLogRepository _sensorLogRepository;
        private readonly INotificationService _notificationService;
        private readonly ISensorRepository _sensorRepository;

        // TEK BİR CONSTRUCTOR VAR VE HEPSİ EŞLEŞTİRİLDİ
        public TaskController(
            ITaskRepository taskRepository,
            ISensorLogRepository sensorLogRepository,
            INotificationService notificationService,
            ISensorRepository sensorRepository)
        {
            _taskRepository = taskRepository;
            _sensorLogRepository = sensorLogRepository;
            _notificationService = notificationService;
            _sensorRepository = sensorRepository;
        }

        [HttpGet]
        public IActionResult GetAllTasks()
        {
            return Ok(_taskRepository.GetAllTasks());
        }

        [HttpGet("user/{userId}")]
        public IActionResult GetTasksByUser(string userId)
        {
            return Ok(_taskRepository.GetTasksByUser(userId));
        }

        public class AssignRequest
        {
            public required string UserId { get; set; }
            public string? Message { get; set; }
            public string? SenderUserId { get; set; }
        }

        [HttpPut("{taskId}/assign")]
        public IActionResult AssignTask(int taskId, [FromBody] AssignRequest request)
        {
            var task = _taskRepository.GetTaskById(taskId);
            if (task == null) return NotFound("Görev bulunamadı.");

            task.AssignedUserId = request.UserId;
            _taskRepository.UpdateTask(task);

            string taskTypeLabel = task.TaskType == "SuEkle" ? "Su ekleme" : "Yem ekleme";
            string defaultMessage = $"{task.CoopId} kümesinde {taskTypeLabel} görevi size atandı.";
            string finalMessage = !string.IsNullOrWhiteSpace(request.Message)
                ? $"{defaultMessage} Not: {request.Message}"
                : defaultMessage;

            _notificationService.CreateNotification(
                userId:        request.UserId,
                message:       finalMessage,
                type:          "Gorev",
                senderUserId:  request.SenderUserId,
                relatedTaskId: task.TaskId
            );

            return Ok(task);
        }

        public class FillRequest
        {
            public required string CompletedByUserId { get; set; }
            public bool IsAdmin { get; set; } // Ek güvenlik
        }

        // KURAL 1: Manuel miktar kalktı, sadece "Doldur" var.
        [HttpPut("{taskId}/fill")]
        public IActionResult FillTask(int taskId, [FromBody] FillRequest request)
        {
            var task = _taskRepository.GetTaskById(taskId);
            if (task == null) return NotFound("Görev bulunamadı.");

            // Sadece atanan kişi veya admin doldurabilir
            if (task.AssignedUserId != request.CompletedByUserId && !request.IsAdmin)
            {
                return BadRequest("Bu görevi sadece atanan kişi veya bir Admin tamamlayabilir.");
            }

            var sensor = _sensorRepository.GetSensorById(task.SensorId);
            if (sensor == null) return NotFound("Sensör bulunamadı.");

            task.Status = "Tamamlandı";
            task.CompletedAt = DateTime.Now;
            task.CompletedByUserId = request.CompletedByUserId;

            // Sensörün max seviyesine otomatik çekiliyor
            task.AddedAmount = sensor.maxThreshold;
            _taskRepository.UpdateTask(task);

            var newLog = new SensorLog
            {
                SensorId = task.SensorId,
                ReadingValue = sensor.maxThreshold,
                ReadAt = DateTime.Now,
                IsNormal = true
            };
            _sensorLogRepository.AddLog(newLog);

            return Ok(task);
        }
    }
}