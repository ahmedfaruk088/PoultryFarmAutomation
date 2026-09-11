"use client";

import { Sensor, getStatus } from "../Data/mockSensor";
import { X, AlertTriangle, CheckCircle, ShieldAlert, WifiOff, Clock } from "lucide-react";

type SensorModalProps = {
  sensor: Sensor | null;
  onClose: () => void;
};

export default function SensorModal({ sensor, onClose }: SensorModalProps) {
  if (!sensor) return null;

  const status = getStatus(sensor);
  const isAlarm = status === "alarm";
  const isOffline = status === "offline";

  // Başlık ikonu + renk teması duruma göre değişiyor
  const headerBg = isOffline ? "#f3f4f6" : isAlarm ? "#fee2e2" : "#dcfce7";
  const headerIconColor = isOffline ? "#6b7280" : isAlarm ? "#b91c1c" : "#15803d";
  const HeaderIcon = isOffline ? WifiOff : isAlarm ? ShieldAlert : CheckCircle;

  // Son okuma saatini Türkçe locale ile formatla
  const lastReadFormatted = sensor.readAt
    ? new Date(sensor.readAt).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: 16,
          width: "100%",
          maxWidth: 500,
          padding: 24,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          position: "relative",
        }}
      >
        {/* ── Başlık ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: headerBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HeaderIcon size={22} color={headerIconColor} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#111827" }}>{sensor.sensorName}</h2>
              <p style={{ fontSize: 13, color: "#6b7280", margin: 0 }}>{sensor.type} Sensörü</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* ── Offline Banner ── */}
        {isOffline && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "#f3f4f6",
              border: "1px solid #d1d5db",
              marginBottom: 16,
            }}
          >
            {/* Üst satır: ikon + başlık */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: lastReadFormatted ? 8 : 0 }}>
              <WifiOff size={16} color="#6b7280" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                Bu sensörden veri alınamıyor
              </span>
            </div>
            {/* Alt satır: son okuma zamanı */}
            {lastReadFormatted && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  paddingLeft: 24, // ikon genişliğiyle hizalamak için
                }}
              >
                <Clock size={12} color="#9ca3af" />
                <span style={{ fontSize: 12, color: "#6b7280" }}>
                  Son başarılı okuma: <strong style={{ color: "#374151" }}>{lastReadFormatted}</strong>
                </span>
              </div>
            )}
            {!lastReadFormatted && (
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0, paddingLeft: 24 }}>
                Bu sensörden henüz hiç veri alınmadı.
              </p>
            )}
          </div>
        )}

        {/* ── Anlık Değer + Eşik (offline'da soluk göster) ── */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            opacity: isOffline ? 0.55 : 1,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: "#4b5563" }}>
              {isOffline ? "Son Okunan Değer:" : "Anlık Okunan Değer:"}
            </span>
            <span style={{ fontSize: 22, fontWeight: 700, color: isAlarm ? "#b91c1c" : "#111827" }}>
              {sensor.value} {sensor.unit}
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#6b7280" }}>
            <span>İzin Verilen Aralık:</span>
            <span style={{ fontWeight: 500, color: "#374151" }}>
              {sensor.minThreshold} {sensor.unit} – {sensor.maxThreshold} {sensor.unit}
            </span>
          </div>
        </div>

        {/* ── Durum Banner (sadece offline değilse) ── */}
        {!isOffline && (
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: isAlarm ? "#fef2f2" : "#f0fdf4",
              border: `1px solid ${isAlarm ? "#fecaca" : "#bbf7d0"}`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 24,
            }}
          >
            <AlertTriangle size={18} color={isAlarm ? "#dc2626" : "#16a34a"} />
            <span style={{ fontSize: 13, color: isAlarm ? "#991b1b" : "#166534", fontWeight: 500 }}>
              {isAlarm
                ? "Uyarı: Sensör belirlenen maksimum sınır değerini aşmış durumda!"
                : "Sistem normal aralıkta kararlı bir şekilde çalışıyor."}
            </span>
          </div>
        )}

        {/* ── Butonlar ── */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: isOffline ? 8 : 0 }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: "1px solid #d1d5db",
              background: "white",
              color: "#374151",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Kapat
          </button>
          {isAlarm && (
            <button
              onClick={() => {
                alert("Alarm operatör tarafından onaylandı ve susturuldu!");
                onClose();
              }}
              style={{
                padding: "10px 16px",
                borderRadius: 8,
                border: "none",
                background: "#dc2626",
                color: "white",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Alarmı Onayla / Sustur
            </button>
          )}
        </div>
      </div>
    </div>
  );
}