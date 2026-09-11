using FactoryDashboard.Entities;

namespace FactoryDashboard.Services
{
    public interface IUserService
    {
        List<User> GetAllUsers();
        User? GetUserById(string userId);
        (User user, string generatedPassword) AddUser(string firstName, string lastName, string email, string? phoneNumber, string role, string? location);
        User? UpdateUser(string userId, User updatedUser);

        // Artık mevcut şifre doğrulaması da yapıyor.
        // Dönüş değeri: Success = işlem başarılı mı, Error = başarısızsa sebep (kullanıcıya gösterilecek mesaj)
        (bool Success, string? Error) ChangePassword(string userId, string currentPassword, string newPassword);

        User? Login(string userId, string password);
    }
}