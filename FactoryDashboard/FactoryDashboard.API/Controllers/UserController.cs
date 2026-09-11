using FactoryDashboard.Entities;
using FactoryDashboard.Services;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace FactoryDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        public IActionResult GetAllUsers([FromQuery] string? location = null)
        {
            var users = _userService.GetAllUsers();
            if (!string.IsNullOrWhiteSpace(location))
                users = users.Where(u => u.Location == location).ToList();
            return Ok(users);
        }

        [HttpGet("{userId}")]
        public IActionResult GetUserById(string userId)
        {
            var user = _userService.GetUserById(userId);
            if (user == null) return NotFound("Kullanıcı bulunamadı.");
            return Ok(user);
        }

        [HttpPost]
        public IActionResult AddUser([FromBody] UserCreateRequest request)
        {
            var (user, generatedPassword) = _userService.AddUser(
                request.FirstName,
                request.LastName,
                request.Email,
                request.PhoneNumber,
                request.Role,
                request.Location
            );

            return Ok(new
            {
                user.UserId,
                user.FirstName,
                user.LastName,
                user.Role,
                InitialPassword = generatedPassword
            });
        }

        [HttpPut("{userId}")]
        public IActionResult UpdateUser(string userId, [FromBody] User updatedUser)
        {
            var result = _userService.UpdateUser(userId, updatedUser);
            if (result == null) return NotFound("Kullanıcı bulunamadı.");
            return Ok(result);
        }

        [HttpPut("change-password")]
        public IActionResult ChangePassword([FromBody] ChangePasswordRequest request)
        {
            var (success, error) = _userService.ChangePassword(request.UserId, request.CurrentPassword, request.NewPassword);
            if (!success)
            {
                // Kullanıcı bulunamadıysa 404, mevcut şifre yanlışsa 400 dönüyoruz
                if (error == "Kullanıcı bulunamadı.") return NotFound(error);
                return BadRequest(error);
            }
            return Ok("Şifre güncellendi.");
        }

        [HttpPost("login")]
        public IActionResult Login([FromBody] LoginRequest request)
        {
            var user = _userService.Login(request.UserId, request.Password);
            if (user == null) return Unauthorized("Kullanıcı adı veya şifre hatalı.");

            return Ok(new
            {
                user.UserId,
                user.FirstName,
                user.LastName,
                user.Role,
                user.Email
            });
        }

        public class UserCreateRequest
        {
            public required string FirstName { get; set; }
            public required string LastName { get; set; }
            public required string Email { get; set; }
            public required string? PhoneNumber { get; set; }
            public required string Role { get; set; }
            public string? Location { get; set; }
        }

        public class ChangePasswordRequest
        {
            public required string UserId { get; set; }
            public required string CurrentPassword { get; set; }
            public required string NewPassword { get; set; }
        }

        public class LoginRequest
        {
            public required string UserId { get; set; }
            public required string Password { get; set; }
        }
    }
}