using FactoryDashboard.Services;
using FactoryDashboard.Services.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CoopController : ControllerBase
    {
        private readonly ICoopService _coopService;

        public CoopController(ICoopService coopService)
        {
            _coopService = coopService;
        }

        [HttpGet]
        public ActionResult<List<CoopResponseDto>> GetAllCoops()
        {
            return Ok(_coopService.GetAllCoops().ToDtoList());
        }

        [HttpGet("{coopId}")]
        public ActionResult<CoopResponseDto> GetCoopById(string coopId)
        {
            var coop = _coopService.GetCoopById(coopId);
            if (coop == null) return NotFound("Kümes bulunamadı.");
            return Ok(coop.ToDto());
        }
    }
}
