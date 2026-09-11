using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;

namespace FactoryDashboard.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _userRepository;

        private static readonly Dictionary<string, string> RolePrefixes = new()
        {
            { "admin", "ADM" },
            { "operator", "OPR" },
            { "technician", "TEK" },
            { "viewer", "VIW" }
        };

        public UserService(IUserRepository userRepository)
        {
            _userRepository = userRepository;
        }

        public List<User> GetAllUsers()
        {
            return _userRepository.GetAllUsers();
        }

        public User? GetUserById(string userId)
        {
            return _userRepository.GetUserById(userId);
        }

        public (User user, string generatedPassword) AddUser(string firstName, string lastName, string email, string? phoneNumber, string role, string? location)
        {
            string prefix = RolePrefixes.TryGetValue(role, out var p) ? p : "USR";

            var existingUsers = _userRepository.GetAllUsers()
                .Where(u => u.UserId.StartsWith(prefix))
                .ToList();

            int nextNumber = existingUsers.Count + 1;
            string newUserId = $"{prefix}{nextNumber:000}";

            // Aynı ID zaten varsa (silinen kullanıcı gibi durumlar için) bir sonrakine geç
            while (_userRepository.GetUserById(newUserId) != null)
            {
                nextNumber++;
                newUserId = $"{prefix}{nextNumber:000}";
            }

            var user = new User
            {
                UserId = newUserId,
                FirstName = firstName,
                LastName = lastName,
                Email = email,
                PhoneNumber = phoneNumber,
                Role = role,
                Location = location,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(newUserId) // ilk şifre = ID
            };

            _userRepository.AddUser(user);
            return (user, newUserId);
        }

        public User? UpdateUser(string userId, User updatedUser)
        {
            var existing = _userRepository.GetUserById(userId);
            if (existing == null) return null;

            existing.FirstName = updatedUser.FirstName;
            existing.LastName = updatedUser.LastName;
            existing.Email = updatedUser.Email;
            existing.PhoneNumber = updatedUser.PhoneNumber;
            existing.Role = updatedUser.Role;
            existing.Location = updatedUser.Location;

            _userRepository.UpdateUser(existing);
            return existing;
        }

        public (bool Success, string? Error) ChangePassword(string userId, string currentPassword, string newPassword)
        {
            var user = _userRepository.GetUserById(userId);
            if (user == null) return (false, "Kullanıcı bulunamadı.");

            // PasswordHash yoksa veya geçerli BCrypt formatında değilse
            // (eski/manuel eklenen kullanıcılar) mevcut şifre doğrulaması atlanır,
            // doğrudan yeni şifre set edilir.
            bool hashIsMissing = string.IsNullOrWhiteSpace(user.PasswordHash)
                                 || !LooksLikeBCryptHash(user.PasswordHash);

            if (!hashIsMissing)
            {
                bool currentPasswordValid;
                try
                {
                    currentPasswordValid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
                }
                catch (Exception)
                {
                    // Hash formatı bozuk — sıfırlama moduna geç
                    currentPasswordValid = false;
                    hashIsMissing = true;
                }

                if (!hashIsMissing && !currentPasswordValid)
                    return (false, "Mevcut şifre hatalı.");
            }

            if (string.IsNullOrWhiteSpace(newPassword) || newPassword.Length < 4)
                return (false, "Yeni şifre en az 4 karakter olmalıdır.");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            _userRepository.UpdateUser(user);
            return (true, null);
        }

        /// <summary>
        /// Bir string'in BCrypt hash formatına benzeyip benzemediğini hızlıca kontrol eder.
        /// BCrypt hash'leri "$2a$", "$2b$" veya "$2y$" ile başlar ve 60 karakter uzunluğundadır.
        /// </summary>
        private static bool LooksLikeBCryptHash(string value)
        {
            return value.Length == 60
                && (value.StartsWith("$2a$")
                    || value.StartsWith("$2b$")
                    || value.StartsWith("$2y$"));
        }

        public User? Login(string userId, string password)
        {
            var user = _userRepository.GetUserById(userId);
            if (user == null || string.IsNullOrEmpty(user.PasswordHash)) return null;

            // Hash formatı geçersizse (eski/manuel kayıt) giriş reddedilir
            if (!LooksLikeBCryptHash(user.PasswordHash)) return null;

            try
            {
                bool isValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
                return isValid ? user : null;
            }
            catch (Exception)
            {
                return null;
            }
        }
    }
}