using FactoryDashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EggProductionController : ControllerBase
    {
        private readonly IEggProductionService _eggService;

        public EggProductionController(IEggProductionService eggService)
        {
            _eggService = eggService;
        }

        [HttpGet("coop/{coopId}")]
        public IActionResult GetByCoop(string coopId)
        {
            return Ok(_eggService.GetByCoopId(coopId));
        }

        [HttpGet("coop/{coopId}/today")]
        public IActionResult GetToday(string coopId)
        {
            return Ok(_eggService.GetOrCreateToday(coopId));
        }
    }
}