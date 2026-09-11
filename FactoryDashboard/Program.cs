using Microsoft.AspNetCore.Mvc;
using System;

var builder = WebApplication.CreateBuilder(args);

// Dependency Injection (Bağımlılık Enjeksiyonu)
// Diyoruz ki: Uygulama çalıştığı sürece hafızada tek bir MockPlcService nesnesi yaşasın.
// Biri senden IPlcService isterse, ona MockPlcService'i ver.
builder.Services.AddSingleton<IPlcService, MockPlcService>();

var app = builder.Build();

// Tarayıcıdan "/api/sensor-data" adresine GET isteği gelirse bu süslü parantezlerin içi çalışacak.
app.MapGet("/api/sensor-data", (IPlcService plcService) =>
{
    try
    {
        var data = plcService.ReadData();
        return Results.Ok(new { status = "success", data = data });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Hata: {ex.Message}");
    }
});

app.Run(); // Sunucuyu ve uygulamayı ayağa kaldır!


public interface IPlcService
{
    object ReadData();
}



public class MockPlcService : IPlcService
{
    private readonly Random _random = new Random();

    public object ReadData()
    {
        // Burada sanki gerçek bir donanımdan okuyormuş gibi sahte sensör değerleri üretiyoruz.
        return new
        {
            MotorRunning = _random.Next(0, 2) == 1, 
            TemperatureCelsius = Math.Round(24.5 + (_random.NextDouble() * 5), 2),
            ProductionCount = _random.Next(100, 500)
        };
    }
}