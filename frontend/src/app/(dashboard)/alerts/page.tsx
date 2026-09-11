"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCoop } from "../../Data/CoopContext";
import {
  Droplets, Wheat, CheckCircle2, Clock, ChevronDown,
  UserPlus, History, Thermometer, Wind, Zap, AlertTriangle,
  WifiOff, Activity,
} from "lucide-react";

// ── Tipler ────────────────────────────────────────────────────────────────────

type LiveSensor = {
  sensorId: string;
  sensorName: string;
  type: string;
  unit: string;
  coopId: string;
  minThreshold: number;
  maxThreshold: number;
  value: number;
  isNormal: boolean;
  readAt: string | null;
  plcId?: string | null;
};

type AlarmHistory = {
  totalAlarmCount: number;
  recentAlarms: { readAt: string; readingValue: number }[];
};

type PlcDeviceInfo = {
  plcId: string;
  plcName: string;
  isConnected: boolean;
};

type TaskItem = {
  taskId: number;
  sensorId: string;
  coopId: string;
  taskType: string;
  status: string;
  createdAt: string;
};

// ── Sensör tipine göre görsel meta ────────────────────────────────────────────

const SENSOR_TYPE_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  "Su Seviyesi":         { label: "Su Seviyesi Kritik",        icon: Droplets,    color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  "Yem Seviyesi":        { label: "Yem Seviyesi Kritik",       icon: Wheat,       color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  "Sıcaklık":            { label: "Sıcaklık Alarmı",           icon: Thermometer, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  "Nem oranı":           { label: "Nem Oranı Alarmı",          icon: Droplets,    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "CO2":                 { label: "CO₂ Alarmı",                icon: Wind,        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "Amonyak":             { label: "Amonyak Alarmı",            icon: Wind,        color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  "Havalandırma Motoru": { label: "Havalandırma Motor Arızası",icon: Zap,         color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
};

function getSensorMeta(type: string) {
  return (
    SENSOR_TYPE_META[type] ?? {
      label: `${type} Alarmı`,
      icon: AlertTriangle,
      color: "#dc2626",
      bg: "#fef2f2",
      border: "#fecaca",
    }
  );
}

// Sensörden 90 sn'den uzun süredir veri gelmediyse offline say
const STALE_MS = 90 * 1000;
function isStale(readAt: string | null): boolean {
  if (!readAt) return true;
  return Date.now() - new Date(readAt).getTime() > STALE_MS;
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const router = useRouter();
  const { selectedCoopId } = useCoop();

  const [liveSensors, setLiveSensors] = useState<LiveSensor[]>([]);
  const [plcDevices, setPlcDevices] = useState<Record<string, PlcDeviceInfo>>({});
  const [historyCache, setHistoryCache] = useState<Record<string, AlarmHistory>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pendingTasks, setPendingTasks] = useState<Record<string, TaskItem>>({});
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("mockRole"));
  }, []);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [liveRes, plcRes, taskRes] = await Promise.all([
          fetch("https://localhost:7069/api/sensor/live"),
          fetch("https://localhost:7069/api/plcdevice"),
          fetch("https://localhost:7069/api/task"),
        ]);

        const live: LiveSensor[] = await liveRes.json();
        setLiveSensors(live);

        const plcs: PlcDeviceInfo[] = await plcRes.json();
        const plcMap: Record<string, PlcDeviceInfo> = {};
        plcs.forEach((p) => { plcMap[p.plcId] = p; });
        setPlcDevices(plcMap);

        const tasks: TaskItem[] = await taskRes.json();
        // sensorId → en son bekleyen görev map'i
        const taskMap: Record<string, TaskItem> = {};
        tasks
          .filter((t) => t.status === "Bekliyor")
          .forEach((t) => {
            // aynı sensör için birden fazla görev olabilir; en yeniyi tut
            if (!taskMap[t.sensorId] || new Date(t.createdAt) > new Date(taskMap[t.sensorId].createdAt)) {
              taskMap[t.sensorId] = t;
            }
          });
        setPendingTasks(taskMap);
      } catch (err) {
        console.error("Alarm verisi alınamadı:", err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  // ── Alarm listesi: isNormal=false VE offline olmayan sensörler ─────────────
  const alarmSensors = liveSensors.filter((s) => {
    if (selectedCoopId && s.coopId !== selectedCoopId) return false;

    // PLC bağlı ama isConnected=false → PLC arızası, ayrı göster
    const plcFault = s.plcId ? plcDevices[s.plcId] && !plcDevices[s.plcId].isConnected : false;
    if (plcFault) return true;

    // Veri alınamıyor (stale) → gösterme (SensorHealthMonitor zaten bildirim üretiyor)
    if (isStale(s.readAt)) return false;

    // Gerçek eşik alarmı
    return !s.isNormal;
  });

  // ── Geçmiş yükleme ────────────────────────────────────────────────────────
  async function handleExpand(sensorId: string) {
    if (expandedId === sensorId) { setExpandedId(null); return; }
    setExpandedId(sensorId);

    if (!historyCache[sensorId]) {
      setLoadingHistory(true);
      try {
        const res = await fetch(`https://localhost:7069/api/sensor/${sensorId}/alarm-history`);
        const data = await res.json();
        setHistoryCache((prev) => ({ ...prev, [sensorId]: data }));
      } catch (err) {
        console.error("Alarm geçmişi alınamadı:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Sistem Alarmları</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
        {selectedCoopId ? "Seçili kümes için" : "Tüm kümesler için"} aktif uyarılar
      </p>

      {alarmSensors.length === 0 ? (
        <div
          style={{
            background: "white", borderRadius: 12,
            border: "1px solid #eef0f2", padding: "40px 0", textAlign: "center",
          }}
        >
          <CheckCircle2 size={32} color="#3f7d58" style={{ marginBottom: 8 }} />
          <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
            Bekleyen alarm yok, sistem stabil.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {alarmSensors.map((sensor) => {
            // PLC bağlantı arızası mı yoksa eşik alarmı mı?
            const plcInfo = sensor.plcId ? plcDevices[sensor.plcId] : null;
            const isPlcFault = !!plcInfo && !plcInfo.isConnected;

            const meta = isPlcFault
              ? { label: "PLC Bağlantı Arızası", icon: WifiOff, color: "#6b7280", bg: "#f3f4f6", border: "#d1d5db" }
              : getSensorMeta(sensor.type);
            const Icon = meta.icon;

            const isExpanded = expandedId === sensor.sensorId;
            const history = historyCache[sensor.sensorId];
            const linkedTask = pendingTasks[sensor.sensorId];

            // Değerin eşiğe ne kadar yakın/aşkın olduğunu göster
            const deviation = isPlcFault
              ? null
              : sensor.value > sensor.maxThreshold
              ? `+${(sensor.value - sensor.maxThreshold).toFixed(1)} ${sensor.unit} (üst eşik aşıldı)`
              : `${(sensor.value - sensor.minThreshold).toFixed(1)} ${sensor.unit} (alt eşiğin altında)`;

            return (
              <div
                key={sensor.sensorId}
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: `1.5px solid ${meta.border}`,
                  overflow: "hidden",
                  transition: "all 0.25s ease",
                }}
              >
                {/* ── Özet Satırı ── */}
                <div
                  onClick={() => handleExpand(sensor.sensorId)}
                  style={{
                    display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "16px 20px", cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: meta.bg,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Icon size={18} color={meta.color} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>
                        {meta.label}
                      </p>
                      <p style={{
                        fontSize: 12, color: "#9ca3af", margin: "3px 0 0",
                        display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap",
                      }}>
                        <Clock size={11} />
                        <span>{sensor.coopId}</span>
                        <span style={{ color: "#6b7280", fontWeight: 500 }}>
                          · {sensor.sensorName || sensor.type}
                        </span>
                        {isPlcFault && plcInfo && (
                          <span style={{ color: "#9ca3af" }}>· {plcInfo.plcName} bağlanamıyor</span>
                        )}
                        {!isPlcFault && deviation && (
                          <span style={{ color: meta.color, fontWeight: 500 }}>· {deviation}</span>
                        )}
                        {sensor.readAt && (
                          <span style={{ color: "#c4c9d4" }}>
                            · {new Date(sensor.readAt).toLocaleString("tr-TR")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {/* Anlık değer rozeti */}
                    {!isPlcFault && (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: meta.bg, padding: "4px 10px",
                        borderRadius: 6, fontSize: 13, fontWeight: 700,
                        color: meta.color,
                      }}>
                        <Activity size={13} />
                        {sensor.value.toFixed(1)} {sensor.unit}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, color: meta.color, fontWeight: 500,
                      background: meta.bg, padding: "3px 8px", borderRadius: 6,
                    }}>
                      {isPlcFault ? "Donanım Kontrolü" : "Müdahale Gerekli"}
                    </div>
                    <ChevronDown
                      size={18} color="#9ca3af"
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    />
                  </div>
                </div>

                {/* ── Genişletilmiş Detay ── */}
                {isExpanded && (
                  <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${meta.border}` }}>

                    {/* PLC arıza açıklaması */}
                    {isPlcFault && (
                      <div style={{
                        marginTop: 16, padding: "10px 14px",
                        background: "#f9fafb", borderRadius: 8,
                        fontSize: 12, color: "#6b7280", lineHeight: "1.5",
                      }}>
                        Bu uyarı bir eşik ihlalinden değil,{" "}
                        <strong>{plcInfo?.plcName}</strong> PLC'sine bağlanılamamasından kaynaklanıyor.
                        Sensör verisi bu yüzden güncellenmiyor — önce PLC bağlantısını (kablo, IP, güç) kontrol edin.
                      </div>
                    )}

                    {/* Eşik bilgisi */}
                    {!isPlcFault && (
                      <div style={{
                        marginTop: 16, display: "flex", gap: 12,
                        background: "#f9fafb", borderRadius: 8, padding: "10px 14px",
                        fontSize: 12,
                      }}>
                        <div>
                          <span style={{ color: "#9ca3af" }}>Anlık değer: </span>
                          <strong style={{ color: meta.color }}>{sensor.value.toFixed(2)} {sensor.unit}</strong>
                        </div>
                        <div style={{ color: "#d1d5db" }}>|</div>
                        <div>
                          <span style={{ color: "#9ca3af" }}>İzin verilen: </span>
                          <strong style={{ color: "#374151" }}>
                            {sensor.minThreshold} – {sensor.maxThreshold} {sensor.unit}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Alarm geçmişi */}
                    <div style={{ paddingTop: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <History size={14} color="#6b7280" />
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>
                          Alarm Geçmişi
                        </p>
                      </div>

                      {loadingHistory && !history ? (
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>Yükleniyor...</p>
                      ) : history ? (
                        <>
                          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 10 }}>
                            Bu sensör toplam <strong>{history.totalAlarmCount}</strong> kez eşik dışına çıktı.
                          </p>
                          <div style={{
                            display: "flex", flexDirection: "column", gap: 4,
                            maxHeight: 140, overflowY: "auto",
                          }}>
                            {history.recentAlarms.map((a, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex", justifyContent: "space-between",
                                  fontSize: 11, color: "#6b7280",
                                  padding: "4px 8px",
                                  background: "#f9fafb", borderRadius: 6,
                                }}
                              >
                                <span>{new Date(a.readAt).toLocaleString("tr-TR")}</span>
                                <span style={{ fontWeight: 600, color: "#dc2626" }}>{a.readingValue}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p style={{ fontSize: 12, color: "#9ca3af" }}>Geçmiş verisi bulunamadı.</p>
                      )}
                    </div>

                    {/* Görevlendir butonu */}
                    {role === "admin" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push("/assignments");
                        }}
                        style={{
                          marginTop: 14,
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "9px 16px", borderRadius: 8,
                          border: "none", background: "#2563eb",
                          color: "white", fontSize: 13,
                          fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        <UserPlus size={15} />
                        Görevlendir
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
