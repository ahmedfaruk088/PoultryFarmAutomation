import { Sensor, getStatus } from "../Data/mockSensor";
import { Thermometer, Droplets, Wind, Waves, Wheat, Activity, WifiOff } from "lucide-react";

type SensorCardProps = {
  sensor: Sensor;
  onClick: () => void;
};

const typeIconMap: Record<string, React.ElementType> = {
  "Sıcaklık": Thermometer,
  "Nem oranı": Droplets,
  "Amonyak": Wind,
  "Su Seviyesi": Waves,
  "Yem Seviyesi": Wheat,
};

export default function SensorCard({ sensor, onClick }: SensorCardProps) {
  const status = getStatus(sensor);
  const isAlarm = status === "alarm";
  const isOffline = status === "offline";
  const Icon = isOffline ? WifiOff : (typeIconMap[sensor.type] || Activity);

  const range = sensor.maxThreshold - sensor.minThreshold;
  const rawPercent = range > 0 ? ((sensor.value - sensor.minThreshold) / range) * 100 : 0;
  const gaugePercent = Math.min(100, Math.max(0, rawPercent));

  const accentColor = isOffline ? "#9ca3af" : isAlarm ? "#dc2626" : "#3f7d58";
  const accentBg = isOffline ? "#f3f4f6" : isAlarm ? "#fef2f2" : "#f0f7f2";

  return (
    <div
      onClick={onClick}
      style={{
        background: isOffline ? "#fafafa" : "white",
        borderRadius: 14,
        padding: "18px 20px",
        cursor: "pointer",
        border: isOffline ? "1px dashed #d1d5db" : "1px solid #eef0f2",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        opacity: isOffline ? 0.75 : 1,
        transition: "box-shadow 0.15s ease, transform 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: accentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={accentColor} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0, color: isOffline ? "#6b7280" : "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sensor.type}
            </p>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {sensor.coopId}
            </p>
          </div>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 9px",
            borderRadius: 20,
            background: isOffline ? "#e5e7eb" : isAlarm ? "#fee2e2" : "#e8f3ec",
            color: isOffline ? "#6b7280" : isAlarm ? "#b91c1c" : "#276240",
            flexShrink: 0,
            whiteSpace: "nowrap",
          }}
        >
          {isOffline ? "Veri Alınamıyor" : isAlarm ? "Alarm" : "Normal"}
        </span>
      </div>

      {isOffline ? (
        <p style={{ fontSize: 13, color: "#9ca3af", margin: "16px 0 10px" }}>
          Son veri: {sensor.readAt ? new Date(sensor.readAt).toLocaleString("tr-TR") : "hiç veri gelmedi"}
        </p>
      ) : (
        <p style={{ fontSize: 30, fontWeight: 700, margin: "16px 0 10px", color: isAlarm ? "#b91c1c" : "#111827", letterSpacing: "-0.02em" }}>
          {sensor.value}
          <span style={{ fontSize: 16, fontWeight: 500, color: "#9ca3af", marginLeft: 3 }}>{sensor.unit}</span>
        </p>
      )}

      {/* Eşik göstergesi */}
      <div style={{ opacity: isOffline ? 0.4 : 1 }}>
        <div style={{ height: 5, borderRadius: 3, background: "#f1f3f5", overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: isOffline ? "0%" : `${gaugePercent}%`,
              background: accentColor,
              borderRadius: 3,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <span style={{ fontSize: 10, color: "#c1c7cd" }}>{sensor.minThreshold}{sensor.unit}</span>
          <span style={{ fontSize: 10, color: "#c1c7cd" }}>{sensor.maxThreshold}{sensor.unit}</span>
        </div>
      </div>
    </div>
  );
}