using FactoryDashboard.DataAccess;
using FactoryDashboard.DataAccess.Interfaces;
using FactoryDashboard.DataAccess.Repositories;
using FactoryDashboard.Services;
using Microsoft.EntityFrameworkCore;
using FactoryDashboard.Services.Hubs;
using FactoryDashboard.Services.Interfaces;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<FactoryDashboardContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ISensorRepository, SensorRepository>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<ISensorLogRepository, SensorLogRepository>();
builder.Services.AddScoped<ICoopRepository, CoopRepository>();
builder.Services.AddScoped<IFlockRepository, FlockRepository>();
builder.Services.AddHostedService<SensorSimulatorService>();
builder.Services.AddScoped<ITaskRepository, TaskRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICoopService, CoopService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IEggProductionService, EggProductionService>();
builder.Services.AddHostedService<PlcService>();
builder.Services.AddHostedService<SensorHealthMonitorService>();
builder.Services.AddScoped<IPlcDeviceService, PlcDeviceService>();
builder.Services.AddScoped<IFlockService, FlockService>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(opts =>
    {
        // Döngüsel referansları (Flock↔Coop gibi) null bırakarak serialization'ın
        // çökmesini engeller. Kalıcı çözüm DTO'lardır; bu sadece güvenlik ağıdır.
        opts.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddSignalR();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();
app.MapHub<SensorHub>("/sensorHub");

app.Run();
