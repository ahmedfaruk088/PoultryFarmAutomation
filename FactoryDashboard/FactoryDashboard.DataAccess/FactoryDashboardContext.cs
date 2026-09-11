using FactoryDashboard.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FactoryDashboard.DataAccess
{
    public class FactoryDashboardContext : DbContext
    {
        public FactoryDashboardContext(DbContextOptions<FactoryDashboardContext> options)
            : base(options)
        {
        }

        public DbSet<User> Users { get; set; }
        public DbSet<Sensor> Sensors { get; set; }
        public DbSet<Report> Reports { get; set; }
        public DbSet<SensorLog> SensorLogs { get; set; }
        public DbSet<Coop> Coops { get; set; }
        public DbSet<Flock> Flocks { get; set; }
        public DbSet<FlockLoss> FlockLosses { get; set; }
        public DbSet<Entities.Task> Tasks { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<Egg> EggProductions { get; set; }
        public DbSet<PlcDevice> PlcDevices { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Coops.CoopId gerçek veritabanında nvarchar(50) - EF Core'un
            // varsayılan olarak nvarchar(450) varsaymasını engellemek için
            // açıkça belirtiyoruz, aksi halde FK/Index oluşturma tip uyuşmazlığı verir.
            modelBuilder.Entity<Coop>()
                .Property(c => c.CoopId)
                .HasMaxLength(50);

            // Flock.CoopId de aynı uzunlukta olmalı (FK karşı tarafı)
            modelBuilder.Entity<Flock>()
                .Property(f => f.CoopId)
                .HasMaxLength(50);

            // Flock -> Coop ilişkisi (bir Coop'un birden fazla Flock'u olabilir)
            modelBuilder.Entity<Flock>()
                .HasOne(f => f.Coop)
                .WithMany(c => c.Flocks)
                .HasForeignKey(f => f.CoopId)
                .OnDelete(DeleteBehavior.Restrict);

            // FlockLoss -> Flock ilişkisi (bir Flock'un birden fazla kayıp kaydı olabilir)
            modelBuilder.Entity<FlockLoss>()
                .HasOne(l => l.Flock)
                .WithMany(f => f.FlockLosses)
                .HasForeignKey(l => l.FlockId)
                .OnDelete(DeleteBehavior.Cascade);

            // Partial/filtered unique index: bir kümeste aynı anda sadece bir aktif
            // (EndDate IS NULL) sürü olabilir. Bu constraint race condition'a karşı
            // DB seviyesinde garanti sağlar; EF Core HasFilter ile SQL Server filtered
            // index olarak oluşturulur.
            modelBuilder.Entity<Flock>()
                .HasIndex(f => f.CoopId)
                .HasFilter("[EndDate] IS NULL")
                .IsUnique()
                .HasDatabaseName("UX_Flocks_CoopId_Active");
        }
    }
}