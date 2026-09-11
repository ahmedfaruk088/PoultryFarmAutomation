"use client";

import { useEffect, useState } from "react";
import { useCoop } from "../../Data/CoopContext";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Thermometer, Droplets, Wind, Waves, Wheat, Activity, ChevronRight, Calendar, X, FileSpreadsheet, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

type Sensor = {
  sensorId: string;
  sensorName: string;
  type: string;
  unit: string;
  coopId: string;
  minThreshold: number;
  maxThreshold: number;
  // live endpoint'inden de gelebilir; grafik sayfasında stale tespiti için kullanılır
  readAt?: string | null;
  plcId?: string | null;
};

// Sensörden 90 saniyeden uzun süredir veri gelmediyse offline say
const SENSOR_STALE_MS = 90 * 1000;
function isSensorOffline(sensor: Sensor): boolean {
  if (!sensor.readAt) return false; // history sayfasında readAt yok → offline gösterme
  return Date.now() - new Date(sensor.readAt).getTime() > SENSOR_STALE_MS;
}

type HistoryPoint = {
  readAt: string;
  readingValue: number;
  isNormal: boolean;
};

type ChartPoint = {
  time: string;
  value: number | null;
  isNormal: boolean;
};

const typeIconMap: Record<string, React.ElementType> = {
  "Sıcaklık": Thermometer,
  "Nem oranı": Droplets,
  "Amonyak": Wind,
  "Su Seviyesi": Waves,
  "Yem Seviyesi": Wheat,
};

// Bir Date nesnesini <input type="date"> için "YYYY-MM-DD" formatına çevirir
function toDateInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

// Bir Date nesnesini <input type="time"> için "HH:MM" formatına çevirir
function toTimeInputValue(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(11, 16);
}

// Seçilen tarih aralığını eşit dilimlere bölüp her dilimin ortalamasını hesaplar.
// Sadece nokta sayısı fazla olduğunda devreye girer; az veri varsa ham noktalar daha doğru.
function bucketizeHistory(history: HistoryPoint[], start: Date, end: Date): ChartPoint[] {
  const totalMs = end.getTime() - start.getTime();
  if (totalMs <= 0) return [];

  // 50'den az nokta varsa bucketize yapma — ham noktaları doğrudan döndür
  if (history.length < 50) {
    return history.map((h) => ({
      time: new Date(h.readAt).toLocaleTimeString("tr-TR", {
        hour: "2-digit", minute: "2-digit",
      }),
      value: h.readingValue,
      isNormal: h.isNormal,
    }));
  }

  // Dilim sayısı aralığın uzunluğuna göre kademeli: kısa aralıkta ince, uzun aralıkta kaba
  const hours = totalMs / (60 * 60 * 1000);
  const bucketCount = Math.min(60, Math.max(20, Math.ceil(hours * 2)));
  const bucketMs = totalMs / bucketCount;
  const spanIsShort = totalMs <= 24 * 60 * 60 * 1000;

  function formatLabel(d: Date): string {
    return spanIsShort
      ? d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
      : `${d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}`;
  }

  const buckets: ChartPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = new Date(start.getTime() + i * bucketMs);
    const bucketEnd = new Date(start.getTime() + (i + 1) * bucketMs);

    const pointsInBucket = history.filter((h) => {
      const t = new Date(h.readAt).getTime();
      return t >= bucketStart.getTime() && t < bucketEnd.getTime();
    });

    if (pointsInBucket.length === 0) {
      buckets.push({ time: formatLabel(bucketStart), value: null, isNormal: true });
    } else {
      const avgTimeMs =
        pointsInBucket.reduce((sum, p) => sum + new Date(p.readAt).getTime(), 0) / pointsInBucket.length;
      const avg = pointsInBucket.reduce((sum, p) => sum + p.readingValue, 0) / pointsInBucket.length;
      const anyAbnormal = pointsInBucket.some((p) => !p.isNormal);
      buckets.push({
        time: formatLabel(new Date(avgTimeMs)),
        value: Math.round(avg * 100) / 100,
        isNormal: !anyAbnormal,
      });
    }
  }

  return buckets;
}

export default function SensorsPage() {
  const { selectedCoopId } = useCoop();
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [histories, setHistories] = useState<Record<string, HistoryPoint[]>>({});

  // Hangi kart modalda açık
  const [expandedSensorId, setExpandedSensorId] = useState<string | null>(null);

  // Modal içindeki tarih/saat seçim inputları
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  // "Uygula" ile onaylanmış aralık verisi + o veriye ait gerçek başlangıç/bitiş, sensorId bazında
  const [rangeHistories, setRangeHistories] = useState<Record<string, HistoryPoint[]>>({});
  const [appliedRanges, setAppliedRanges] = useState<Record<string, { start: string; end: string }>>({});
  const [rangeLoading, setRangeLoading] = useState(false);
  const [rangeError, setRangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCoopId) return;

    async function fetchSensors() {
      // live endpoint zaten readAt + isNormal içeriyor; coopId'ye göre filtrele
      const res = await fetch(`https://localhost:7069/api/sensor/live`);
      const data = await res.json();
      const coopSensors = data.filter((s: Sensor) => s.coopId === selectedCoopId);
      setSensors(coopSensors);

      coopSensors.forEach(async (sensor: Sensor) => {
        const historyRes = await fetch(`https://localhost:7069/api/sensor/${sensor.sensorId}/history`);
        const historyData = await historyRes.json();
        setHistories((prev) => ({ ...prev, [sensor.sensorId]: historyData }));
      });
    }

    fetchSensors();
    const interval = setInterval(fetchSensors, 10000);
    return () => clearInterval(interval);
  }, [selectedCoopId]);

  // Modal açıkken arka planın kaymasını engelle
  useEffect(() => {
    document.body.style.overflow = expandedSensorId ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [expandedSensorId]);

  function handleOpenModal(sensorId: string) {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    setStartDate(toDateInputValue(dayStart));
    setStartTime("00:00");
    setEndDate(toDateInputValue(now));
    setEndTime(toTimeInputValue(now));

    setExpandedSensorId(sensorId);
    setRangeError(null);
  }

  function handleCloseModal() {
    setExpandedSensorId(null);
    setRangeError(null);
  }

  async function handleApplyRange(sensorId: string) {
    if (!startDate || !startTime || !endDate || !endTime) {
      setRangeError("Lütfen başlangıç ve bitiş tarih/saatini seçin.");
      return;
    }

    const start = new Date(`${startDate}T${startTime}:00`);
    const end = new Date(`${endDate}T${endTime}:00`);

    if (start >= end) {
      setRangeError("Başlangıç, bitişten önce olmalı.");
      return;
    }

    setRangeError(null);
    setRangeLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString(),
        end: end.toISOString(),
      });
      const res = await fetch(`https://localhost:7069/api/sensor/${sensorId}/history?${params.toString()}`);
      if (!res.ok) throw new Error("Veri alınamadı");
      const data: HistoryPoint[] = await res.json();
      setRangeHistories((prev) => ({ ...prev, [sensorId]: data }));
      setAppliedRanges((prev) => ({ ...prev, [sensorId]: { start: start.toISOString(), end: end.toISOString() } }));
    } catch (err) {
      setRangeError("Veri çekilirken bir hata oluştu.");
    } finally {
      setRangeLoading(false);
    }
  }

  function handleExportExcel(sensor: Sensor) {
    const rawData = rangeHistories[sensor.sensorId];
    const range = appliedRanges[sensor.sensorId];
    if (!rawData || rawData.length === 0) return;

    const rows = rawData.map((h) => ({
      "Tarih": new Date(h.readAt).toLocaleDateString("tr-TR"),
      "Saat": new Date(h.readAt).toLocaleTimeString("tr-TR"),
      [`Değer (${sensor.unit})`]: h.readingValue,
      "Durum": h.isNormal ? "Normal" : "Alarm",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 10 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sensör Verisi");

    const startLabel = range ? new Date(range.start).toLocaleDateString("tr-TR").replaceAll(".", "-") : "";
    const endLabel = range ? new Date(range.end).toLocaleDateString("tr-TR").replaceAll(".", "-") : "";
    const fileName = `${sensor.sensorName}_${startLabel}_${endLabel}.xlsx`;

    XLSX.writeFile(workbook, fileName);
  }

  function handleClearRange(sensorId: string) {
    setRangeHistories((prev) => {
      const next = { ...prev };
      delete next[sensorId];
      return next;
    });
    setAppliedRanges((prev) => {
      const next = { ...prev };
      delete next[sensorId];
      return next;
    });
    setRangeError(null);
  }

  if (!selectedCoopId) {
    return (
      <div style={{ textAlign: "center", color: "#6b7280", marginTop: 60 }}>
        Grafikleri görmek için üstteki menüden bir kümes seçin.
      </div>
    );
  }

  const modalSensor = sensors.find((s) => s.sensorId === expandedSensorId) || null;
  const modalHasCustomRange = modalSensor ? !!rangeHistories[modalSensor.sensorId] : false;
  const modalIsOffline = modalSensor ? isSensorOffline(modalSensor) : false;

  let modalChartData: ChartPoint[] = [];
  if (modalSensor) {
    if (modalHasCustomRange && appliedRanges[modalSensor.sensorId]) {
      const { start, end } = appliedRanges[modalSensor.sensorId];
      modalChartData = bucketizeHistory(rangeHistories[modalSensor.sensorId], new Date(start), new Date(end));
    } else {
      modalChartData = (histories[modalSensor.sensorId] || []).map((h) => ({
        time: new Date(h.readAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        value: h.readingValue,
        isNormal: h.isNormal,
      }));
    }
  }
  const modalLastPoint = [...modalChartData].reverse().find((p) => p.value !== null);
  const modalIsAlarm = !!modalLastPoint && !modalLastPoint.isNormal;
  const modalLineColor = modalIsOffline ? "#9ca3af" : modalIsAlarm ? "#dc2626" : "#3f7d58";

  return (
    <div>
      <style>{`
        @keyframes overlayFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          from { opacity: 0; transform: scale(0.9) translateY(16px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .iot-card {
          transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
        }
        .iot-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 28px -12px rgba(20,30,25,0.16);
          border-color: #d7e6dc;
        }
        .iot-card:active {
          transform: translateY(-1px);
        }

        .iot-range-pill {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border: 1px solid #e3e7e4;
          border-radius: 12px;
          padding: 7px 12px;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .iot-range-pill:focus-within {
          border-color: #3f7d58;
          box-shadow: 0 0 0 3px rgba(63,125,88,0.12);
        }
        .iot-range-pill input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 12.5px;
          color: #1f2937;
          font-family: inherit;
        }
        .iot-range-pill input[type="date"] { width: 100px; }
        .iot-range-pill input[type="time"] { width: 68px; }
        .iot-range-divider {
          width: 1px;
          align-self: stretch;
          background: #e3e7e4;
        }

        .iot-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          font-weight: 600;
          padding: 10px 18px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.08s ease;
        }
        .iot-btn:active { transform: scale(0.96); }
        .iot-btn:disabled { opacity: 0.6; cursor: default; transform: none; }

        .iot-btn-primary { background: #3f7d58; color: white; box-shadow: 0 2px 6px rgba(63,125,88,0.28); }
        .iot-btn-primary:hover:not(:disabled) { background: #356b4b; }

        .iot-btn-report { background: #1f6b45; color: white; box-shadow: 0 2px 6px rgba(31,107,69,0.28); }
        .iot-btn-report:hover { background: #175534; }

        .iot-btn-ghost { background: transparent; color: #6b7280; border: 1px solid #e3e7e4; padding: 9px 14px; }
        .iot-btn-ghost:hover { background: #f7f8f7; color: #374151; border-color: #d7dbd8; }
      `}</style>

      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 20 }}>Sensör Geçmişi</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {sensors.map((sensor) => {
          const Icon = typeIconMap[sensor.type] || Activity;
          const hasCustomRange = !!rangeHistories[sensor.sensorId];
          const history = histories[sensor.sensorId] || [];
          const chartData = history.map((h) => ({
            time: new Date(h.readAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
            value: h.readingValue,
            isNormal: h.isNormal,
          }));

          const latestIsAlarm = chartData.length > 0 && !chartData[chartData.length - 1].isNormal;
          const isOffline = isSensorOffline(sensor);
          const lineColor = isOffline ? "#9ca3af" : latestIsAlarm ? "#dc2626" : "#3f7d58";

          return (
            <div
              key={sensor.sensorId}
              onClick={() => handleOpenModal(sensor.sensorId)}
              className="iot-card"
              style={{
                background: isOffline ? "#fafafa" : "white",
                borderRadius: 16,
                padding: "20px 22px",
                border: isOffline
                  ? "1px dashed #d1d5db"
                  : latestIsAlarm
                  ? "1.5px solid #fecaca"
                  : "1px solid #eef0f2",
                boxShadow: latestIsAlarm && !isOffline ? "0 2px 10px rgba(220,38,38,0.1)" : "0 1px 3px rgba(20,30,25,0.04)",
                cursor: "pointer",
                opacity: isOffline ? 0.8 : 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isOffline
                        ? "#f3f4f6"
                        : latestIsAlarm
                        ? "linear-gradient(155deg, #fef2f2 0%, #fde2e2 100%)"
                        : "linear-gradient(155deg, #eef6f0 0%, #e2f0e6 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} color={lineColor} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 650, fontSize: 14, margin: 0, color: isOffline ? "#6b7280" : "#1f2937", letterSpacing: "-0.1px" }}>{sensor.type}</p>
                    <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "1px 0 0" }}>{sensor.sensorName}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {hasCustomRange && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px 3px 7px",
                        borderRadius: 20,
                        background: "#eef2ff",
                        color: "#4338ca",
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4338ca" }} />
                      Özel aralık
                    </span>
                  )}
                  {isOffline && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px 3px 7px",
                        borderRadius: 20,
                        background: "#f3f4f6",
                        color: "#6b7280",
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#9ca3af" }} />
                      Veri Alınamıyor
                    </span>
                  )}
                  {latestIsAlarm && !isOffline && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "3px 9px 3px 7px",
                        borderRadius: 20,
                        background: "#fee2e2",
                        color: "#b91c1c",
                      }}
                    >
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626" }} />
                      Alarm
                    </span>
                  )}
                  <ChevronRight size={16} color="#c1c5cb" />
                </div>
              </div>

              {chartData.length > 0 ? (
                <div style={{ position: "relative" }}>
                  {/* Offline ise grafiğin üzerine gri bir sis katmanı koy */}
                  {isOffline && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 8,
                        background: "rgba(243,244,246,0.75)",
                        backdropFilter: "blur(1.5px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        zIndex: 1,
                        pointerEvents: "none",
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280" }}>Veri Alınamıyor</span>
                      {sensor.readAt && (
                        <span style={{ fontSize: 10, color: "#9ca3af" }}>
                          Son: {new Date(sensor.readAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                      <YAxis domain={[sensor.minThreshold, sensor.maxThreshold]} tick={{ fontSize: 10 }} width={30} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={lineColor}
                        strokeWidth={2}
                        dot={(props: any) => {
                          const isAlarmPoint = !props.payload.isNormal;
                          return (
                            <circle
                              key={props.index}
                              cx={props.cx}
                              cy={props.cy}
                              r={isAlarmPoint ? 4 : 2}
                              fill={isOffline ? "#9ca3af" : isAlarmPoint ? "#dc2626" : "#3f7d58"}
                            />
                          );
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>
                  Henüz veri yok
                </p>
              )}
            </div>
          );
        })}
      </div>

      {modalSensor && (
        <div
          onClick={handleCloseModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            animation: "overlayFade 0.18s ease",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white",
              borderRadius: 18,
              padding: "24px 28px",
              width: "100%",
              maxWidth: 780,
              maxHeight: "88vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
              animation: "modalPop 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: modalIsAlarm
                      ? "linear-gradient(155deg, #fef2f2 0%, #fde2e2 100%)"
                      : "linear-gradient(155deg, #eef6f0 0%, #e2f0e6 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(() => {
                    const ModalIcon = typeIconMap[modalSensor.type] || Activity;
                    return <ModalIcon size={20} color={modalLineColor} />;
                  })()}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{modalSensor.type}</p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{modalSensor.sensorName}</p>
                </div>
                {modalIsAlarm && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: "#fee2e2",
                      color: "#b91c1c",
                    }}
                  >
                    Alarm
                  </span>
                )}
                {modalIsOffline && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: "#f3f4f6",
                      color: "#6b7280",
                    }}
                  >
                    Veri Alınamıyor
                  </span>
                )}
              </div>

              <button
                onClick={handleCloseModal}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  border: "none",
                  background: "#f3f4f6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={15} color="#6b7280" />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 12,
                background: "linear-gradient(180deg, #fafbfa 0%, #f5f7f5 100%)",
                border: "1px solid #eef0f2",
                borderRadius: 14,
                padding: "14px 16px",
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <label className="iot-range-pill">
                  <Calendar size={13} color="#8a9a90" />
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  <span className="iot-range-divider" />
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </label>

                <ArrowRight size={15} color="#b7c0ba" style={{ flexShrink: 0 }} />

                <label className="iot-range-pill">
                  <Calendar size={13} color="#8a9a90" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  <span className="iot-range-divider" />
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </label>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
                <button
                  onClick={() => handleApplyRange(modalSensor.sensorId)}
                  disabled={rangeLoading}
                  className="iot-btn iot-btn-primary"
                >
                  {rangeLoading ? "Yükleniyor..." : "Uygula"}
                </button>

                {modalHasCustomRange && (
                  <>
                    <button onClick={() => handleExportExcel(modalSensor)} className="iot-btn iot-btn-report">
                      <FileSpreadsheet size={13} /> Raporla
                    </button>

                    <button onClick={() => handleClearRange(modalSensor.sensorId)} className="iot-btn iot-btn-ghost">
                      <X size={12} /> Temizle
                    </button>
                  </>
                )}
              </div>

              {rangeError && <span style={{ fontSize: 11, color: "#b91c1c", width: "100%" }}>{rangeError}</span>}
            </div>

            {modalChartData.length > 0 ? (
              <div style={{ position: "relative" }}>
                {/* Offline ise grafiğin üzerine gri sis katmanı */}
                {modalIsOffline && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 10,
                      background: "rgba(243,244,246,0.78)",
                      backdropFilter: "blur(2px)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      zIndex: 1,
                      pointerEvents: "none",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>Veri Alınamıyor</span>
                    {modalSensor?.readAt && (
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        Son başarılı okuma:{" "}
                        <strong style={{ color: "#374151" }}>
                          {new Date(modalSensor.readAt).toLocaleString("tr-TR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </strong>
                      </span>
                    )}
                  </div>
                )}
                <ResponsiveContainer width="100%" height={360}>
                  <LineChart data={modalChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      interval={modalChartData.length > 12 ? Math.ceil(modalChartData.length / 8) : 0}
                      tickLine={false}
                      axisLine={{ stroke: "#eef0f2" }}
                    />
                    <YAxis
                      domain={[modalSensor.minThreshold, modalSensor.maxThreshold]}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      width={32}
                      tickLine={false}
                      axisLine={{ stroke: "#eef0f2" }}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #eef0f2", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
                      labelStyle={{ color: "#6b7280", fontWeight: 600 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={modalLineColor}
                      strokeWidth={2}
                      connectNulls={false}
                      dot={(props: any) => {
                        if (props.payload.value === null) return <g key={props.index} />;
                        const isAlarmPoint = !props.payload.isNormal;
                        return (
                          <circle
                            key={props.index}
                            cx={props.cx}
                            cy={props.cy}
                            r={isAlarmPoint ? 4 : 2}
                            fill={modalIsOffline ? "#9ca3af" : isAlarmPoint ? "#dc2626" : "#3f7d58"}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", padding: "40px 0" }}>Henüz veri yok</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}