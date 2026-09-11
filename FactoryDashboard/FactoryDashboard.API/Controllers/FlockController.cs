using FactoryDashboard.Entities;
using FactoryDashboard.Services.Dtos;
using FactoryDashboard.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FlockController : ControllerBase
    {
        private readonly IFlockService _flockService;

        public FlockController(IFlockService flockService)
        {
            _flockService = flockService;
        }

        // GET api/flock/5/losses
        [HttpGet("{flockId}/losses")]
        public ActionResult<List<FlockLoss>> GetLosses(int flockId)
        {
            var flock = _flockService.GetFlockById(flockId);
            if (flock == null)
                return NotFound($"FlockId {flockId} bulunamadı.");

            return Ok(_flockService.GetLossesByFlockId(flockId));
        }

        // GET api/flock
        [HttpGet]
        public ActionResult<List<FlockResponseDto>> GetAllFlocks()
        {
            return Ok(_flockService.GetAllFlocks().ToDtoList());
        }

        // GET api/flock/5
        [HttpGet("{flockId}")]
        public ActionResult<FlockResponseDto> GetFlockById(int flockId)
        {
            var flock = _flockService.GetFlockById(flockId);
            if (flock == null)
                return NotFound($"FlockId {flockId} bulunamadı.");

            return Ok(flock.ToDto());
        }

        // GET api/flock/coop/hq-coop-1
        [HttpGet("coop/{coopId}")]
        public ActionResult<List<FlockResponseDto>> GetFlocksByCoopId(string coopId)
        {
            return Ok(_flockService.GetFlocksByCoopId(coopId).ToDtoList());
        }

        // GET api/flock/coop/hq-coop-1/active
        [HttpGet("coop/{coopId}/active")]
        public ActionResult<FlockResponseDto> GetActiveFlockByCoopId(string coopId)
        {
            var flock = _flockService.GetActiveFlockByCoopId(coopId);
            if (flock == null)
                return NotFound($"{coopId} için aktif sürü bulunamadı.");

            return Ok(flock.ToDto());
        }

        // POST api/flock
        [HttpPost]
        public ActionResult<FlockResponseDto> StartFlock([FromBody] StartFlockRequest request)
        {
            var result = _flockService.StartFlock(
                request.CoopId, request.Breed, request.StartDate, request.InitialCount);

            if (!result.Success)
                return ToErrorResponse(result.ErrorType, result.ErrorMessage);

            var dto = result.Data!.ToDto();
            return CreatedAtAction(nameof(GetFlockById), new { flockId = dto.FlockId }, dto);
        }

        // PATCH api/flock/5/loss
        [HttpPatch("{flockId}/loss")]
        public ActionResult<FlockResponseDto> RecordLoss(int flockId, [FromBody] RecordLossRequest request)
        {
            var result = _flockService.RecordLoss(flockId, request.LossCount);
            if (!result.Success)
                return ToErrorResponse(result.ErrorType, result.ErrorMessage);

            return Ok(result.Data!.ToDto());
        }

        // POST api/flock/5/end
        [HttpPost("{flockId}/end")]
        public ActionResult<FlockResponseDto> EndFlock(int flockId, [FromBody] EndFlockRequest request)
        {
            var result = _flockService.EndFlock(flockId, request.EndDate);
            if (!result.Success)
                return ToErrorResponse(result.ErrorType, result.ErrorMessage);

            return Ok(result.Data!.ToDto());
        }

        // Servisten dönen hata tipine göre doğru HTTP status code'unu seçer
        private ActionResult ToErrorResponse(FlockServiceErrorType? errorType, string? message)
        {
            return errorType switch
            {
                FlockServiceErrorType.NotFound   => NotFound(message),
                FlockServiceErrorType.Conflict   => Conflict(message),
                _                                => BadRequest(message)
            };
        }
    }

    public class StartFlockRequest
    {
        public required string CoopId { get; set; }
        public required string Breed { get; set; }
        public DateTime StartDate { get; set; }
        public int InitialCount { get; set; }
    }

    public class RecordLossRequest
    {
        public int LossCount { get; set; }
    }

    public class EndFlockRequest
    {
        public DateTime EndDate { get; set; }
    }
}
