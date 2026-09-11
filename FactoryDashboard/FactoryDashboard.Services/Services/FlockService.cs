using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.Entities;
using FactoryDashboard.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace FactoryDashboard.Services
{
    public class FlockService : IFlockService
    {
        private readonly IFlockRepository _flockRepository;
        private readonly ICoopRepository _coopRepository;

        public FlockService(IFlockRepository flockRepository, ICoopRepository coopRepository)
        {
            _flockRepository = flockRepository;
            _coopRepository = coopRepository;
        }

        // ── Sorgular ─────────────────────────────────────────────────────────

        public List<Flock> GetAllFlocks() => _flockRepository.GetAllFlocks();

        public Flock? GetFlockById(int flockId) => _flockRepository.GetFlockById(flockId);

        public List<Flock> GetFlocksByCoopId(string coopId) => _flockRepository.GetFlocksByCoopId(coopId);

        public Flock? GetActiveFlockByCoopId(string coopId) => _flockRepository.GetActiveFlockByCoopId(coopId);

        public List<FlockLoss> GetLossesByFlockId(int flockId) => _flockRepository.GetLossesByFlockId(flockId);

        // ── StartFlock ────────────────────────────────────────────────────────

        public FlockServiceResult<Flock> StartFlock(
            string coopId, string breed, DateTime startDate, int initialCount)
        {
            // Kullanıcı dostu hızlı kontrol (race condition için yeterli değil,
            // asıl garantiyi DB unique index sağlar)
            var existingActive = _flockRepository.GetActiveFlockByCoopId(coopId);
            if (existingActive != null)
            {
                return FlockServiceResult<Flock>.Fail(
                    $"{coopId} kümesinde zaten aktif bir sürü var (FlockId: {existingActive.FlockId}). " +
                    "Yeni sürü başlatmadan önce mevcut sürüyü sonlandırın.",
                    FlockServiceErrorType.Conflict);
            }

            if (initialCount <= 0)
            {
                return FlockServiceResult<Flock>.Fail(
                    "Başlangıç sayısı 0'dan büyük olmalı.",
                    FlockServiceErrorType.ValidationError);
            }

            var coop = _coopRepository.GetCoopById(coopId);
            if (coop == null)
            {
                return FlockServiceResult<Flock>.Fail(
                    $"{coopId} kümesi bulunamadı.",
                    FlockServiceErrorType.NotFound);
            }

            var flock = new Flock
            {
                CoopId      = coopId,
                Breed       = breed,
                StartDate   = startDate,
                InitialCount = initialCount,
                CurrentCount = initialCount,
                EndDate     = null,
            };

            try
            {
                _flockRepository.AddFlock(flock);
            }
            catch (DbUpdateException)
            {
                // DB partial unique index ihlali: başka bir istek eş zamanlı olarak
                // aynı kümese aktif sürü eklemiş — Conflict döndür
                return FlockServiceResult<Flock>.Fail(
                    $"{coopId} kümesinde zaten aktif bir sürü var. Lütfen sayfayı yenileyip tekrar deneyin.",
                    FlockServiceErrorType.Conflict);
            }

            // Coop.CurrentCount güncelle
            coop.CurrentCount = initialCount;
            coop.Status = "active";
            _coopRepository.UpdateCoop(coop);

            return FlockServiceResult<Flock>.Ok(flock);
        }

        // ── RecordLoss ────────────────────────────────────────────────────────

        public FlockServiceResult<Flock> RecordLoss(int flockId, int lossCount)
        {
            var flock = _flockRepository.GetFlockById(flockId);
            if (flock == null)
                return FlockServiceResult<Flock>.Fail(
                    $"FlockId {flockId} bulunamadı.",
                    FlockServiceErrorType.NotFound);

            if (flock.EndDate != null)
                return FlockServiceResult<Flock>.Fail(
                    "Sonlandırılmış bir sürüye kayıp girilemez.",
                    FlockServiceErrorType.ValidationError);

            if (lossCount <= 0)
                return FlockServiceResult<Flock>.Fail(
                    "Kayıp sayısı 0'dan büyük olmalı.",
                    FlockServiceErrorType.ValidationError);

            if (lossCount > flock.CurrentCount)
                return FlockServiceResult<Flock>.Fail(
                    $"Kayıp sayısı ({lossCount}) mevcut sayıdan ({flock.CurrentCount}) fazla olamaz.",
                    FlockServiceErrorType.ValidationError);

            // Audit trail: kayıp kaydı oluştur
            _flockRepository.AddFlockLoss(new FlockLoss
            {
                FlockId    = flockId,
                LossCount  = lossCount,
                RecordedAt = DateTime.Now,
            });

            // Sürü sayısını güncelle
            flock.CurrentCount -= lossCount;
            _flockRepository.UpdateFlock(flock);

            // Coop.CurrentCount senkronize et
            var coop = _coopRepository.GetCoopById(flock.CoopId);
            if (coop != null)
            {
                coop.CurrentCount = flock.CurrentCount;
                _coopRepository.UpdateCoop(coop);
            }

            return FlockServiceResult<Flock>.Ok(flock);
        }

        // ── EndFlock ──────────────────────────────────────────────────────────

        public FlockServiceResult<Flock> EndFlock(int flockId, DateTime endDate)
        {
            var flock = _flockRepository.GetFlockById(flockId);
            if (flock == null)
                return FlockServiceResult<Flock>.Fail(
                    $"FlockId {flockId} bulunamadı.",
                    FlockServiceErrorType.NotFound);

            if (flock.EndDate != null)
                return FlockServiceResult<Flock>.Fail(
                    "Bu sürü zaten sonlandırılmış.",
                    FlockServiceErrorType.ValidationError);

            if (endDate < flock.StartDate)
                return FlockServiceResult<Flock>.Fail(
                    "Bitiş tarihi başlangıç tarihinden önce olamaz.",
                    FlockServiceErrorType.ValidationError);

            flock.EndDate = endDate;
            _flockRepository.UpdateFlock(flock);

            // Coop.CurrentCount = 0, Status = "empty"
            var coop = _coopRepository.GetCoopById(flock.CoopId);
            if (coop != null)
            {
                coop.CurrentCount = 0;
                coop.Status = "empty";
                _coopRepository.UpdateCoop(coop);
            }

            return FlockServiceResult<Flock>.Ok(flock);
        }
    }
}
