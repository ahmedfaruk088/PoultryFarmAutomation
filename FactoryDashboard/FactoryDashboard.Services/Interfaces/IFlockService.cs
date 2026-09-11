using FactoryDashboard.Entities;

namespace FactoryDashboard.Services.Interfaces
{
    public interface IFlockService
    {
        List<Flock> GetAllFlocks();
        Flock? GetFlockById(int flockId);
        List<Flock> GetFlocksByCoopId(string coopId);
        Flock? GetActiveFlockByCoopId(string coopId);

        // Kayıp geçmişi
        List<FlockLoss> GetLossesByFlockId(int flockId);

        // Sonuç tipi (FlockServiceResult) hata mesajlarını taşımak için —
        // controller HTTP kodunu buna göre seçiyor (Conflict, BadRequest, Ok vb.)
        FlockServiceResult<Flock> StartFlock(string coopId, string breed, DateTime startDate, int initialCount);
        FlockServiceResult<Flock> RecordLoss(int flockId, int lossCount);
        FlockServiceResult<Flock> EndFlock(int flockId, DateTime endDate);
    }

    // Basit bir sonuç sarmalayıcı: başarı/başarısızlık + hata mesajı + hata tipi.
    // Controller bu tipe bakarak doğru HTTP status code'unu seçer.
    public class FlockServiceResult<T>
    {
        public bool Success { get; private set; }
        public T? Data { get; private set; }
        public string? ErrorMessage { get; private set; }
        public FlockServiceErrorType? ErrorType { get; private set; }

        public static FlockServiceResult<T> Ok(T data) =>
            new() { Success = true, Data = data };

        public static FlockServiceResult<T> Fail(string message, FlockServiceErrorType errorType) =>
            new() { Success = false, ErrorMessage = message, ErrorType = errorType };
    }

    public enum FlockServiceErrorType
    {
        NotFound,
        Conflict,
        ValidationError
    }
}