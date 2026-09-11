using FactoryDashboard.Entities;
using FactoryDashboard.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Linq;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlcDeviceController : ControllerBase
    {
        private readonly IPlcDeviceService _plcDeviceService;

        public PlcDeviceController(IPlcDeviceService plcDeviceService)
        {
            _plcDeviceService = plcDeviceService;
        }

        // Frontend'in beklediği alan isimleriyle dönen/alan DTO.
        // Entity'nin gerçek alan isimlerine (Name, IpAddress, CpuType, LastConnectedAt) dokunmuyor.
        public class PlcDeviceDto
        {
            public required string PlcId { get; set; }
            public required string PlcName { get; set; }
            public required string PlcIp { get; set; }
            public int Rack { get; set; }
            public int Slot { get; set; }
            public required string PlcCpuType { get; set; }
            public required string CoopId { get; set; }
            public bool IsActive { get; set; } = true;
            public DateTime? LastConnectedTime { get; set; }
            /// <summary>
            /// PlcService tarafından her bağlantı döngüsünde güncellenen gerçek zamanlı bağlantı durumu.
            /// </summary>
            public bool IsConnected { get; set; }
        }

        private static PlcDeviceDto ToDto(PlcDevice p) => new()
        {
            PlcId = p.PlcId,
            PlcName = p.Name,
            PlcIp = p.IpAddress,
            Rack = p.Rack,
            Slot = p.Slot,
            PlcCpuType = p.CpuType,
            CoopId = p.CoopId,
            IsActive = p.IsActive,
            LastConnectedTime = p.LastConnectedAt,
            IsConnected = p.IsConnected
        };

        [HttpGet]
        public IActionResult GetAll()
        {
            return Ok(_plcDeviceService.GetAll().Select(ToDto));
        }

        [HttpGet("{plcId}")]
        public IActionResult GetById(string plcId)
        {
            var device = _plcDeviceService.GetById(plcId);
            if (device == null) return NotFound("PLC bulunamadı.");
            return Ok(ToDto(device));
        }

        [HttpPost]
        public IActionResult AddDevice([FromBody] PlcDeviceDto dto)
        {
            var device = new PlcDevice
            {
                PlcId = dto.PlcId,
                Name = dto.PlcName,
                IpAddress = dto.PlcIp,
                Rack = dto.Rack,
                Slot = dto.Slot,
                CpuType = dto.PlcCpuType,
                CoopId = dto.CoopId,
                IsActive = dto.IsActive
            };
            var created = _plcDeviceService.AddDevice(device);
            return Ok(ToDto(created));
        }

        [HttpPut("{plcId}")]
        public IActionResult UpdateDevice(string plcId, [FromBody] PlcDeviceDto dto)
        {
            var updated = new PlcDevice
            {
                PlcId = dto.PlcId,
                Name = dto.PlcName,
                IpAddress = dto.PlcIp,
                Rack = dto.Rack,
                Slot = dto.Slot,
                CpuType = dto.PlcCpuType,
                CoopId = dto.CoopId,
                IsActive = dto.IsActive
            };
            var result = _plcDeviceService.UpdateDevice(plcId, updated);
            if (result == null) return NotFound("PLC bulunamadı.");
            return Ok(ToDto(result));
        }

        [HttpDelete("{plcId}")]
        public IActionResult DeleteDevice(string plcId)
        {
            var success = _plcDeviceService.DeleteDevice(plcId);
            if (!success) return NotFound("PLC bulunamadı.");
            return Ok();
        }

        public class AssignSensorRequest
        {
            public required string SensorId { get; set; }
            public required string PlcId { get; set; }
            public int DbNumber { get; set; }
            public int StartByte { get; set; }
            public required string DataType { get; set; }
        }

        [HttpPost("assign-sensor")]
        public IActionResult AssignSensor([FromBody] AssignSensorRequest request)
        {
            var sensor = _plcDeviceService.AssignSensorToPlc(
                request.SensorId, request.PlcId, request.DbNumber, request.StartByte, request.DataType);
            if (sensor == null) return NotFound("Sensör bulunamadı.");
            return Ok(sensor);
        }

        [HttpPost("test-connection")]
        public IActionResult TestConnection([FromBody] TestConnectionRequest request)
        {
            try
            {
                if (!Enum.TryParse(request.CpuType, out S7.Net.CpuType cpuType))
                    return BadRequest("Geçersiz CPU tipi.");

                using var plc = new S7.Net.Plc(cpuType, request.IpAddress, (short)request.Rack, (short)request.Slot);
                plc.Open();
                bool success = plc.IsConnected;
                plc.Close();

                return Ok(new { success });
            }
            catch (Exception ex)
            {
                return Ok(new { success = false, error = ex.Message });
            }
        }

        public class TestConnectionRequest
        {
            public required string IpAddress { get; set; }
            public int Rack { get; set; }
            public int Slot { get; set; }
            public required string CpuType { get; set; }
        }
    }
}