"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, ShieldAlert, Save, Maximize2, Minimize2, Activity, Trash2, Zap, X, Server } from "lucide-react";
import { useCoop } from "../../Data/CoopContext";
import { useSensorSocket } from "../../Data/useSensorSocket";

const sensorCatalog = [
  { type: "Sıcaklık", image: "/temperature-control.png", unit: "°C" },
  { type: "Nem oranı", image: "/drop.png", unit: "%" },
  { type: "Su Seviyesi", image: "/water-tank.png", unit: "%" },
  { type: "Yem Seviyesi", image: "/brewery.png", unit: "%" },
  { type: "Havalandırma Motoru", image: "/fan.png", unit: "RPM" },
];

const DATA_TYPES = [
  { value: "Bool", label: "Bool (1 bit)" },
  { value: "Int", label: "Int (16 bit)" },
  { value: "Word", label: "Word (16 bit)" },
  { value: "Real", label: "Real (32 bit)" },
];

const CPU_TYPES = ["S71200", "S71500", "S7300", "S7400"];

type BackendSensor = {
  sensorId: string;
  sensorName: string;
  type: string;
  unit: string;
  coopId: string;
  positionX: number | null;
  positionY: number | null;
};

type LiveSensor = {
  sensorId: string;
  type: string;
  coopId: string;
  value: number;
};

type Coop = {
  coopId: string;
  coopName: string;
};

type EggRecord = {
  totalEggs: number;
  brokenEggs: number;
};

type PlacedSensor = {
  id: string;
  sensorId: string;
  type: string;
  image: string;
  unit: string;
  x: number;
  y: number;
  value: number;
};

type PlcDevice = {
  plcId: string;
  plcName: string;
  plcIp: string;
  rack: number;
  slot: number;
  plcCpuType: string;
  isActive: boolean;
  isConnected: boolean;
};

type SensorPlcInfo = {
  plcId: string | null;
  plcDbNumber: number | null;
  plcStartByte: number | null;
  plcDataType: string | null;
};

function isValidIp(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

export default function ScadaPage() {
  const { selectedCoopId } = useCoop();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastUpdate = useSensorSocket();

  const [isDesignMode, setIsDesignMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [draftSensors, setDraftSensors] = useState<PlacedSensor[]>([]);
  const [savedSensors, setSavedSensors] = useState<PlacedSensor[]>([]);
  const [coopName, setCoopName] = useState("");
  const [eggData, setEggData] = useState<EggRecord | null>(null);
  const [waterValue, setWaterValue] = useState<number | null>(null);
  const [feedValue, setFeedValue] = useState<number | null>(null);

  const [plcDevices, setPlcDevices] = useState<PlcDevice[]>([]);
  const [sensorPlcMap, setSensorPlcMap] = useState<Record<string, SensorPlcInfo>>({});
  const [modalSensor, setModalSensor] = useState<PlacedSensor | null>(null);
  const [useNewDevice, setUseNewDevice] = useState(false);
  const [plcSaving, setPlcSaving] = useState(false);
  const [plcForm, setPlcForm] = useState({
    plcId: "",
    plcName: "",
    plcIp: "",
    rack: 0,
    slot: 1,
    plcCpuType: "S71200",
    dbNumber: 1,
    dataType: "Real",
    byteOffset: 0,
  });

  useEffect(() => {
    if (!selectedCoopId) return;

    async function fetchAll() {
      try {
        const [sensorRes, liveRes, coopRes, eggRes, allSensorRes, plcRes] = await Promise.all([
          fetch(`https://localhost:7069/api/sensor/coop/${selectedCoopId}`),
          fetch("https://localhost:7069/api/sensor/live"),
          fetch("https://localhost:7069/api/coop"),
          fetch(`https://localhost:7069/api/eggproduction/coop/${selectedCoopId}/today`),
          fetch("https://localhost:7069/api/sensor"),
          fetch("https://localhost:7069/api/plcdevice"),
        ]);

        const sensors: BackendSensor[] = await sensorRes.json();
        const liveValues: LiveSensor[] = await liveRes.json();
        const coops: Coop[] = await coopRes.json();
        const egg: EggRecord = await eggRes.json();
        const allSensors: any[] = await allSensorRes.json();
        const devices: PlcDevice[] = await plcRes.json();

        const coop = coops.find((c) => c.coopId === selectedCoopId);
        setCoopName(coop?.coopName || selectedCoopId || "");
        setEggData(egg);
        
        // Sadece o kümese ait olan veya kümes bilgisi eşleşen PLC'leri de filtreleyebiliriz.
        // Genel göstermek istersen filter'ı kaldırabilirsin.
        setPlcDevices(devices);

        const plcMap: Record<string, SensorPlcInfo> = {};
        allSensors.forEach((s) => {
          plcMap[s.sensorId] = {
            plcId: s.plcId ?? null,
            plcDbNumber: s.plcDbNumber ?? null,
            plcStartByte: s.plcStartByte ?? null,
            plcDataType: s.plcDataType ?? null,
          };
        });
        setSensorPlcMap(plcMap);

        const water = liveValues.find((s) => s.coopId === selectedCoopId && s.type === "Su Seviyesi");
        const feed = liveValues.find((s) => s.coopId === selectedCoopId && s.type === "Yem Seviyesi");
        setWaterValue(water?.value ?? null);
        setFeedValue(feed?.value ?? null);

        const placed: PlacedSensor[] = sensors
          .filter((s) => s.positionX !== null && s.positionY !== null)
          .map((s) => {
            const catalogItem = sensorCatalog.find((c) => c.type === s.type);
            const live = liveValues.find((l) => l.sensorId === s.sensorId);
            return {
              id: s.sensorId,
              sensorId: s.sensorId,
              type: s.type || "Bilinmiyor",
              image: catalogItem?.image || "/temperature-control.png",
              unit: catalogItem?.unit || "",
              x: s.positionX!,
              y: s.positionY!,
              value: live?.value ?? 0,
            };
          });

        setSavedSensors(placed);
      } catch (err) {
        console.error("SCADA verisi alınamadı:", err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [selectedCoopId]);

  useEffect(() => {
    if (!lastUpdate || lastUpdate.coopId !== selectedCoopId) return;

    const updateFn = (prev: PlacedSensor[]) =>
      prev.map((s) => (s.sensorId === lastUpdate.sensorId ? { ...s, value: lastUpdate.value } : s));

    setSavedSensors(updateFn);
    setDraftSensors(updateFn);

    if (lastUpdate.type === "Su Seviyesi") setWaterValue(lastUpdate.value);
    if (lastUpdate.type === "Yem Seviyesi") setFeedValue(lastUpdate.value);
  }, [lastUpdate, selectedCoopId]);

  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch (err) {
      setIsFullscreen((prev) => !prev);
    }
  }

  const toggleDesignMode = () => {
    if (!isDesignMode) {
      setDraftSensors([...savedSensors]);
    }
    setIsDesignMode(!isDesignMode);
  };

  async function saveLayout() {
    try {
      await Promise.all(
        draftSensors.map((s) =>
          fetch(`https://localhost:7069/api/sensor/${s.sensorId}/position`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ positionX: s.x, positionY: s.y }),
          })
        )
      );

      setSavedSensors([...draftSensors]);
      setIsDesignMode(false);
      alert("Yerleşim başarıyla kaydedildi!");
    } catch (err) {
      console.error("Yerleşim kaydedilemedi:", err);
      alert("Kaydetme sırasında hata oluştu.");
    }
  }

  const handleCatalogDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData("source", "catalog");
    e.dataTransfer.setData("type", item.type);
    e.dataTransfer.setData("image", item.image);
    e.dataTransfer.setData("unit", item.unit);
  };

  const handleExistingDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("source", "existing");
    e.dataTransfer.setData("id", id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDesignMode || !selectedCoopId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const source = e.dataTransfer.getData("source");

    if (source === "existing") {
      const id = e.dataTransfer.getData("id");
      setDraftSensors((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
    } else if (source === "catalog") {
      const type = e.dataTransfer.getData("type");
      const image = e.dataTransfer.getData("image");
      const unit = e.dataTransfer.getData("unit");

      const thresholds: Record<string, { min: number; max: number }> = {
        "Sıcaklık": { min: 18, max: 30 },
        "Nem oranı": { min: 40, max: 70 },
        "Su Seviyesi": { min: 20, max: 100 },
        "Yem Seviyesi": { min: 15, max: 100 },
        "Havalandırma Motoru": { min: 0, max: 3000 },
      };
      const range = thresholds[type] || { min: 0, max: 100 };

      try {
        const res = await fetch("https://localhost:7069/api/sensor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coopId: selectedCoopId,
            type,
            unit,
            minThreshold: range.min,
            maxThreshold: range.max,
            positionX: x,
            positionY: y,
          }),
        });
        const newSensor = await res.json();

        setDraftSensors((prev) => [
          ...prev,
          {
            id: newSensor.sensorId,
            sensorId: newSensor.sensorId,
            type,
            image,
            unit,
            x,
            y,
            value: (range.min + range.max) / 2,
          },
        ]);
      } catch (err) {
        console.error("Yeni sensör oluşturulamadı:", err);
        alert("Sensör eklenirken hata oluştu.");
      }
    }
  };

  async function handleDeleteSensor(sensorId: string) {
    if (!confirm(`"${sensorId}" sensörünü silmek istediğinize emin misiniz?`)) return;

    try {
      const response = await fetch(
        `https://localhost:7069/api/sensor/${encodeURIComponent(sensorId)}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Silme başarısız (${response.status}): ${errorText}`);
      }

      setDraftSensors((prev) => prev.filter((s) => s.sensorId !== sensorId));
      setSavedSensors((prev) => prev.filter((s) => s.sensorId !== sensorId));
    } catch (err: any) {
      console.error("Sensör silinemedi:", err);
      alert(err.message || "Silme sırasında hata oluştu.");
    }
  }

  function openPlcModal(sensor: PlacedSensor) {
    const existing = sensorPlcMap[sensor.sensorId];
    setUseNewDevice(false);
    setPlcForm({
      plcId: existing?.plcId || "",
      plcName: "",
      plcIp: "",
      rack: 0,
      slot: 1,
      plcCpuType: "S71200",
      dbNumber: existing?.plcDbNumber ?? 1,
      dataType: existing?.plcDataType || "Real",
      byteOffset: existing?.plcStartByte ?? 0,
    });
    setModalSensor(sensor);
  }

  function closePlcModal() {
    setModalSensor(null);
  }

  async function handleSavePlcAssignment() {
    if (!modalSensor) return;

    let plcId = plcForm.plcId;

    if (useNewDevice) {
      if (!plcForm.plcName.trim() || !isValidIp(plcForm.plcIp)) {
        alert("Cihaz adı ve geçerli bir IP adresi girin.");
        return;
      }
      plcId = `plc-${Date.now()}`;
      try {
        await fetch("https://localhost:7069/api/plcdevice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plcId,
            plcName: plcForm.plcName,
            plcIp: plcForm.plcIp,
            rack: plcForm.rack,
            slot: plcForm.slot,
            plcCpuType: plcForm.plcCpuType,
            coopId: selectedCoopId,
            isActive: true,
          }),
        });
      } catch (err) {
        console.error("PLC cihazı oluşturulamadı:", err);
        alert("PLC cihazı oluşturulurken hata oluştu.");
        return;
      }
    } else if (!plcId) {
      alert("Bir PLC cihazı seçin veya yeni cihaz ekleyin.");
      return;
    }

    setPlcSaving(true);
    try {
      await fetch("https://localhost:7069/api/plcdevice/assign-sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorId: modalSensor.sensorId,
          plcId,
          dbNumber: plcForm.dbNumber,
          startByte: plcForm.byteOffset,
          dataType: plcForm.dataType,
        }),
      });

      setSensorPlcMap((prev) => ({
        ...prev,
        [modalSensor.sensorId]: {
          plcId,
          plcDbNumber: plcForm.dbNumber,
          plcStartByte: plcForm.byteOffset,
          plcDataType: plcForm.dataType,
        },
      }));

      if (useNewDevice) {
        const res = await fetch("https://localhost:7069/api/plcdevice");
        setPlcDevices(await res.json());
      }

      closePlcModal();
    } catch (err) {
      console.error("PLC eşlemesi kaydedilemedi:", err);
      alert("Kaydetme sırasında hata oluştu.");
    } finally {
      setPlcSaving(false);
    }
  }

  const activeSensors = isDesignMode ? draftSensors : savedSensors;
  const resourceSensors = activeSensors.filter(s => s?.type === "Su Seviyesi" || s?.type === "Yem Seviyesi");
  const envSensors = activeSensors.filter(s => s?.type !== "Su Seviyesi" && s?.type !== "Yem Seviyesi");

  return (
    <div
      ref={containerRef}
      style={
        isFullscreen
          ? {
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9999,
              display: "flex",
              backgroundColor: "#060913",
              color: "#e2e8f0",
              fontFamily: "system-ui, sans-serif",
              overflow: "auto",
              boxSizing: "border-box",
              margin: 0,
              padding: 0,
            }
          : {
              display: "flex",
              width: "calc(100% + 48px)",
              minHeight: "calc(100vh - 70px)",
              backgroundColor: "#060913",
              color: "#e2e8f0",
              fontFamily: "system-ui, sans-serif",
              overflow: "auto",
              boxSizing: "border-box",
              margin: "-24px",
              padding: 0,
            }
      }
    >
      <style>{`
        @keyframes move-egg-left {
          0% { right: 8%; opacity: 0; transform: translateY(-50%) scale(0.6); }
          15% { opacity: 1; transform: translateY(-50%) scale(1); }
          85% { opacity: 1; transform: translateY(-50%) scale(1); }
          100% { right: 82%; opacity: 0; transform: translateY(-50%) scale(0.6); }
        }
        @keyframes move-egg-right {
          0% { left: 8%; opacity: 0; transform: translateY(-50%) scale(0.6); }
          15% { opacity: 1; transform: translateY(-50%) scale(1); }
          85% { opacity: 1; transform: translateY(-50%) scale(1); }
          100% { left: 82%; opacity: 0; transform: translateY(-50%) scale(0.6); }
        }
        @keyframes conveyor-belt-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 0; }
        }
        @keyframes flow-pipe {
          0% { background-position: 0 0; }
          100% { background-position: 30px 0; }
        }
        @keyframes spin-fan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .egg-left {
          position: absolute; 
          top: 50%; 
          width: 14px; 
          height: 18px;
          animation: move-egg-left 3s linear infinite; 
          filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 2px rgba(234, 179, 8, 0.8)); 
          z-index: 10;
        }
        .egg-right {
          position: absolute; 
          top: 50%; 
          width: 14px; 
          height: 18px;
          animation: move-egg-right 3s linear infinite; 
          filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 2px rgba(234, 179, 8, 0.8)); 
          z-index: 10;
        }
        .fan-rotating {
          animation: spin-fan 1.5s linear infinite;
        }
        .conveyor-track {
          background: #111827;
          background-image: repeating-linear-gradient(90deg, #1f2937, #1f2937 10px, #111827 10px, #111827 20px);
          animation: conveyor-belt-move 1.2s linear infinite;
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.8);
          border: 1px solid #374151;
        }
        .pipe-flow {
          background: repeating-linear-gradient(90deg, #38bdf8, #38bdf8 10px, rgba(56,189,248,0.2) 10px, rgba(56,189,248,0.2) 20px);
          background-size: 30px 100%;
          animation: flow-pipe 1s linear infinite;
        }
        .pipe-flow-feed {
          background: repeating-linear-gradient(90deg, #f59e0b, #f59e0b 10px, rgba(245,158,11,0.2) 10px, rgba(245,158,11,0.2) 20px);
          background-size: 30px 100%;
          animation: flow-pipe 1s linear infinite;
        }
        .glow-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(56, 189, 248, 0.2);
        }
      `}</style>

      {/* 1. SOL PANEL */}
      <aside style={{ width: "380px", minWidth: "380px", backgroundColor: "#0b101d", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px", gap: "16px", flexShrink: 0, overflowY: "auto" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#38bdf8", boxShadow: "0 0 12px #38bdf8" }}></div>
            <h2 style={{ fontSize: "18px", fontWeight: "bold", color: "#f8fafc", margin: 0, letterSpacing: "0.5px" }}>KÜMES SCADA</h2>
          </div>
          <p style={{ fontSize: "12px", color: "#64748b", margin: "6px 0 0 20px" }}>
            {selectedCoopId ? coopName : "Kümes seçilmedi"}
          </p>
        </div>

        {!selectedCoopId && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 12, fontSize: 13, color: "#fca5a5", lineHeight: "1.4" }}>
            Yerleşimi görmek için üstteki menüden bir kümes seçin.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "rgba(15,23,42,0.6)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.04)" }}>
          <span style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", letterSpacing: "0.5px" }}>OPERASYON MODU</span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={toggleDesignMode}
              disabled={!selectedCoopId}
              style={{
                flex: 1, fontSize: "14px", backgroundColor: isDesignMode ? "#ef4444" : "#0284c7",
                color: "white", border: "none", padding: "12px", borderRadius: "8px",
                cursor: selectedCoopId ? "pointer" : "not-allowed", fontWeight: "bold",
                opacity: selectedCoopId ? 1 : 0.5, transition: "all 0.2s"
              }}
            >
              {isDesignMode ? "İptal Et" : "🛠️ Tasarla"}
            </button>
            {isDesignMode && (
              <button
                onClick={saveLayout}
                style={{
                  flex: 1, fontSize: "14px", backgroundColor: "#22c55e",
                  color: "white", border: "none", padding: "12px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s"
                }}
              >
                <Save size={16} /> Kaydet
              </button>
            )}
          </div>
          <p style={{ fontSize: "11px", color: "#64748b", margin: 0, lineHeight: "1.4" }}>
            İpucu: Yerleştirilmiş sensöre çift tıklayarak PLC etiketi tanımlayabilirsiniz.
          </p>
        </div>

        {isDesignMode && (
          <div style={{ backgroundColor: "rgba(15, 23, 42, 0.9)", padding: "16px", borderRadius: "10px", border: "1px dashed #38bdf8", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", marginBottom: 4 }}>Sensör Ekle (Sürükle):</div>
            {sensorCatalog.map((item, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) => handleCatalogDragStart(e, item)}
                style={{
                  display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px",
                  backgroundColor: "#020617", borderRadius: "8px", cursor: "grab", fontSize: "13px", border: "1px solid rgba(56, 189, 248, 0.3)", transition: "all 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#0f172a"}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = "#020617"}
              >
                <img src={item.image} alt="" style={{ width: "20px" }} />
                <span>{item.type}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
          <div style={{ fontSize: "13px", fontWeight: "bold", color: "#38bdf8", borderBottom: "1px solid rgba(56,189,248,0.2)", paddingBottom: "6px", display: "flex", justifyContent: "space-between" }}>
            <span>ORTAM DEĞERLERİ</span>
            <span style={{ color: "#64748b", fontWeight: "normal" }}>{envSensors.length} Sensör</span>
          </div>

          {envSensors.length === 0 && (
            <div style={{ fontSize: "12px", color: "#64748b", fontStyle: "italic", padding: "10px 0" }}>Aktif sensör bulunmuyor.</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {envSensors.map(s => (
              <div key={s.id} className="glow-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "8px", borderLeft: `3px solid ${s.type?.includes("Sıcaklık") ? "#ef4444" : s.type?.includes("Nem") ? "#3b82f6" : "#22c55e"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <img src={s.image} alt={s.type} style={{ width: "18px", opacity: 0.8 }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>{s.type}</span>
                    <span style={{ fontSize: "14px", fontWeight: "bold", color: "#f8fafc" }}>
                      {(s.value ?? 0).toFixed(1)} <span style={{ fontSize: "11px", color: "#64748b" }}>{s.unit}</span>
                    </span>
                  </div>
                </div>
                {isDesignMode && (
                  <button
                    onClick={() => handleDeleteSensor(s.sensorId)}
                    style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 4, padding: 6, cursor: "pointer" }}
                    title="Sensörü Sil"
                  >
                    <Trash2 size={14} color="#ef4444" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "auto", background: "linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(15, 23, 42, 0.8) 100%)", padding: "16px", borderRadius: "10px", border: "1px solid rgba(234, 179, 8, 0.3)" }}>
          <div style={{ fontSize: "12px", fontWeight: "bold", color: "#eab308", marginBottom: "8px" }}>GÜNLÜK ÜRETİM</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fef08a", display: "flex", alignItems: "center", gap: "10px" }}>
            <img src="/egg.png" alt="" style={{ width: "24px" }} /> {eggData?.totalEggs ?? "-"} Adet
          </div>
          {eggData && eggData.brokenEggs > 0 && (
            <div style={{ fontSize: "12px", color: "#f87171", marginTop: 6, fontWeight: "bold" }}>{eggData.brokenEggs} kırık yumurta</div>
          )}
        </div>
      </aside>

      {/* 2. ORTA ALAN */}
      <main style={{ flex: 1, padding: "20px", display: "flex", flexDirection: "column", gap: "16px", position: "relative", minWidth: 0 }}>
        
        <div style={{ height: "45px", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#f8fafc", margin: 0 }}>Çiftlik Yerleşim ve Akış Şeması</h1>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>{coopName || "Düzenlenebilir Sensör Konumlandırma"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {(() => {
              // isActive=true olan PLC'lerin tamamı isConnected=true ise sistem aktif,
              // en az biri bağlanamadıysa uyarı göster.
              const activePlcs = plcDevices.filter(p => p.isActive);
              const anyDisconnected = activePlcs.some(p => !p.isConnected);
              const statusOk = activePlcs.length === 0 || !anyDisconnected;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: statusOk ? "rgba(34, 197, 94, 0.1)" : "rgba(239,68,68,0.1)", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${statusOk ? "rgba(34, 197, 94, 0.3)" : "rgba(239,68,68,0.3)"}` }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusOk ? "#22c55e" : "#ef4444", boxShadow: `0 0 8px ${statusOk ? "#22c55e" : "#ef4444"}` }}></span>
                  <span style={{ fontSize: "12px", fontWeight: "bold", color: statusOk ? "#22c55e" : "#ef4444", letterSpacing: "0.5px" }}>
                    {statusOk ? "SİSTEM AKTİF" : "PLC BAĞLANTI SORUNU"}
                  </span>
                </div>
              );
            })()}

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
              style={{
                display: "flex", alignItems: "center", gap: 8, background: "rgba(56, 189, 248, 0.1)", border: "1px solid rgba(56, 189, 248, 0.3)",
                borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#38bdf8", fontSize: 12, fontWeight: "bold", transition: "all 0.2s"
              }}
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullscreen ? "Çık" : "Tam Ekran"}
            </button>
          </div>
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            flex: 1,
            minHeight: "550px",
            backgroundColor: "#090e1a",
            backgroundImage: "radial-gradient(rgba(56, 189, 248, 0.08) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            borderRadius: "14px",
            border: isDesignMode ? "2px dashed #38bdf8" : "1px solid rgba(56, 189, 248, 0.2)",
            position: "relative", overflow: "hidden",
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)"
          }}
        >
          <div style={{ position: "absolute", left: "20px", top: "35%", display: "flex", flexDirection: "column", gap: "45px", zIndex: 10 }}>
            <div style={{ position: "relative", backgroundColor: "#0f172a", border: "2px solid #f59e0b", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 0 15px rgba(245,158,11,0.3)", width: "160px" }}>
              <span style={{ fontSize: "22px" }}>🏭</span>
              <div>
                <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>YEM SİLOLARI</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f59e0b" }}>
                  {feedValue !== null ? `%${feedValue.toFixed(0)}` : "-"}
                </div>
              </div>
              <div style={{ position: "absolute", right: "-105px", top: "50%", transform: "translateY(-50%)", width: "105px", height: "6px", zIndex: -1 }} className="pipe-flow-feed" title="Yem Boru Hattı" />
            </div>

            <div style={{ position: "relative", backgroundColor: "#0f172a", border: "2px solid #38bdf8", borderRadius: "10px", padding: "10px 12px", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 0 15px rgba(56,189,248,0.3)", width: "160px" }}>
              <span style={{ fontSize: "22px" }}>🛢️</span>
              <div>
                <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: "bold" }}>SU TANKI</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8" }}>
                  {waterValue !== null ? `%${waterValue.toFixed(0)}` : "-"}
                </div>
              </div>
              <div style={{ position: "absolute", right: "-105px", top: "50%", transform: "translateY(-50%)", width: "105px", height: "6px", zIndex: -1 }} className="pipe-flow" title="Su Boru Hattı" />
            </div>
          </div>

          <div style={{ position: "absolute", inset: "25px 25px 25px 285px", border: "2px solid rgba(56, 189, 248, 0.3)", borderRadius: "12px", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "16px", pointerEvents: "none", background: "rgba(11, 16, 29, 0.4)" }}>
            <div style={{ position: "absolute", left: "-14px", top: "5%", bottom: "5%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {[1, 2, 3, 4, 5].map((f) => (
                <div key={f} style={{ width: "22px", height: "22px", backgroundColor: "#0f172a", border: "2px solid #38bdf8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(56, 189, 248, 0.4)" }}>
                  <img src="/fan.png" alt="Fan" className="fan-rotating" style={{ width: "12px" }} />
                </div>
              ))}
            </div>

            <div style={{ position: "absolute", right: "-14px", top: "5%", bottom: "5%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              {[1, 2, 3, 4, 5].map((f) => (
                <div key={f} style={{ width: "22px", height: "22px", backgroundColor: "#0f172a", border: "2px solid #38bdf8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 10px rgba(56, 189, 248, 0.4)" }}>
                  <img src="/fan.png" alt="Fan" className="fan-rotating" style={{ width: "12px" }} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", height: "100%", padding: "0 10px" }}>
              <div style={{ width: "46%", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
                {[1, 2, 3, 4, 5].map((line) => (
                  <div key={line} className="conveyor-track" style={{ height: "32px", borderRadius: "6px", position: "relative", display: "flex", alignItems: "center", paddingLeft: "10px" }}>
                    <span style={{ fontSize: "9px", fontWeight: "bold", color: "#38bdf8", position: "absolute", left: "6px", zIndex: 4, background: "rgba(17,24,39,0.8)", padding: "1px 3px", borderRadius: "3px" }}>A{line}</span>
                    <img src="/egg.png" alt="Yumurta" className="egg-right" style={{ animationDelay: `${line * 0.7}s` }} />
                  </div>
                ))}
              </div>

              <div style={{ width: "46%", display: "flex", flexDirection: "column", justifyContent: "space-around" }}>
                {[1, 2, 3, 4, 5].map((line) => (
                  <div key={line} className="conveyor-track" style={{ height: "32px", borderRadius: "6px", position: "relative", display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: "10px" }}>
                    <span style={{ fontSize: "9px", fontWeight: "bold", color: "#38bdf8", position: "absolute", right: "6px", zIndex: 4, background: "rgba(17,24,39,0.8)", padding: "1px 3px", borderRadius: "3px" }}>B{line}</span>
                    <img src="/egg.png" alt="Yumurta" className="egg-left" style={{ animationDelay: `${line * 0.5}s` }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {activeSensors.map((sensor) => {
            const plcInfo = sensorPlcMap[sensor.sensorId];
            const isLinked = !!plcInfo?.plcId;

            return (
              <div
                key={sensor.id}
                draggable={isDesignMode}
                onDragStart={(e) => handleExistingDragStart(e, sensor.id)}
                onDoubleClick={() => openPlcModal(sensor)}
                title="Çift tıkla: PLC etiketi tanımla"
                style={{
                  position: "absolute",
                  left: `${sensor.x}%`,
                  top: `${sensor.y}%`,
                  transform: "translate(-50%, -50%)",
                  background: "rgba(15, 23, 42, 0.95)",
                  border: isDesignMode ? "2px dashed #38bdf8" : "1px solid #38bdf8",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 0 15px rgba(56, 189, 248, 0.4)",
                  zIndex: 20,
                  cursor: isDesignMode ? "grab" : "pointer"
                }}
              >
                {isLinked && <Zap size={12} color="#22c55e" />}
                <img src={sensor.image} alt="" style={{ width: "16px" }} />
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#22c55e" }}>
                  {(sensor.value ?? 0).toFixed(1)} {sensor.unit}
                </span>
              </div>
            );
          })}
        </div>

        {/* Sensör Kılavuzu - Minimal Tasarım */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", marginTop: "auto", padding: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Eye size={14} color="#64748b" />
            <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "bold", letterSpacing: "0.5px" }}>KILAVUZ:</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "20px" }}>
            {sensorCatalog.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <img src={item.image} alt={item.type} style={{ width: "14px", opacity: 0.6, filter: "grayscale(20%)" }} />
                <span style={{ fontSize: "11px", color: "#94a3b8" }}>{item.type}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* 3. SAĞ PANEL */}
      <aside style={{ width: "280px", minWidth: "280px", backgroundColor: "#0b101d", borderLeft: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", padding: "20px", gap: "16px", flexShrink: 0, overflowY: "auto" }}>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="glow-card" style={{ padding: "14px", borderRadius: "10px", borderLeft: "4px solid #38bdf8", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "28px" }}>🛢️</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Su Deposu</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#38bdf8" }}>
                {waterValue !== null ? `%${waterValue.toFixed(1)}` : "-"}
              </div>
            </div>
          </div>

          <div className="glow-card" style={{ padding: "14px", borderRadius: "10px", borderLeft: "4px solid #f59e0b", display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ fontSize: "28px" }}>🏭</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "2px" }}>Yem Silosu</div>
              <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>
                {feedValue !== null ? `%${feedValue.toFixed(1)}` : "-"}
              </div>
            </div>
          </div>
        </div>

        {resourceSensors.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8", borderBottom: "1px solid rgba(56,189,248,0.2)", paddingBottom: "6px" }}>
              SAHA KAYNAK SENSÖRLERİ
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {resourceSensors.map(s => (
                <div key={s.id} className="glow-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderRadius: "8px", borderLeft: `3px solid ${s.type?.includes("Su") ? "#38bdf8" : "#f59e0b"}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={s.image} alt={s.type} style={{ width: "18px", opacity: 0.8 }} />
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase" }}>{s.type}</span>
                      <span style={{ fontSize: "14px", fontWeight: "bold", color: "#f8fafc" }}>
                        {(s.value ?? 0).toFixed(1)} <span style={{ fontSize: "11px", color: "#64748b" }}>{s.unit}</span>
                      </span>
                    </div>
                  </div>
                  {isDesignMode && (
                    <button
                      onClick={() => handleDeleteSensor(s.sensorId)}
                      style={{ background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 4, padding: 6, cursor: "pointer" }}
                      title="Sensörü Sil"
                    >
                      <Trash2 size={14} color="#ef4444" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto" }}>
          
          {/* YENİ EKLENEN PLC DURUM LİSTESİ */}
          {plcDevices.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
              <div style={{ fontSize: "12px", fontWeight: "bold", color: "#38bdf8", borderBottom: "1px solid rgba(56,189,248,0.2)", paddingBottom: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Server size={14} /> PLC AĞ DURUMU
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {plcDevices.map(plc => {
                  // isActive = "bu PLC izlensin mi" (admin ayarı)
                  // isConnected = PlcService'in son döngüde gerçekten bağlanabildi mi
                  const isOnline = plc.isActive && plc.isConnected;
                  const statusColor = !plc.isActive ? "#64748b" : plc.isConnected ? "#22c55e" : "#ef4444";
                  const statusGlow = !plc.isActive ? "#64748b" : plc.isConnected ? "#22c55e" : "#ef4444";
                  const statusLabel = !plc.isActive ? "PASİF" : plc.isConnected ? "BAĞLI" : "BAĞLANAMADI";

                  return (
                    <div key={plc.plcId} className="glow-card" style={{ padding: "10px 12px", borderRadius: "8px", borderLeft: `3px solid ${statusColor}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", color: "#f8fafc" }}>{plc.plcName}</div>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "monospace", marginTop: "2px" }}>{plc.plcIp}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: statusColor, boxShadow: `0 0 8px ${statusGlow}` }}></span>
                        <span style={{ fontSize: "10px", fontWeight: "bold", color: statusColor }}>{statusLabel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <ShieldAlert size={18} color="#ef4444" />
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#ef4444", letterSpacing: "0.5px" }}>SİSTEM DURUMU</span>
          </div>
          <div style={{ backgroundColor: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", padding: "14px", borderRadius: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#86efac", display: "flex", alignItems: "center", gap: "8px" }}>
              <Activity size={16} />
              {waterValue !== null && waterValue < 30 ? "Uyarı: Su seviyesi düşük!" : "Tüm sistemler normal."}
            </div>
          </div>
        </div>
      </aside>

      {/* PLC ETİKET EŞLEME MODALI */}
      {modalSensor && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000,
          }}
        >
          <div
            style={{
              background: "#0b101d", border: "1px solid rgba(56,189,248,0.3)", borderRadius: 16,
              padding: 24, width: 440, maxHeight: "85vh", overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={18} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: 16, color: "#f8fafc" }}>PLC Etiketi Tanımla</h3>
              </div>
              <button onClick={closePlcModal} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12, color: "#64748b", marginBottom: 16 }}>
              Sensör: <strong style={{ color: "#e2e8f0" }}>{modalSensor.type}</strong> ({modalSensor.sensorId})
            </p>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => setUseNewDevice(false)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: !useNewDevice ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                  background: !useNewDevice ? "rgba(56,189,248,0.15)" : "transparent",
                  color: !useNewDevice ? "#38bdf8" : "#94a3b8",
                }}
              >
                Mevcut Cihaz
              </button>
              <button
                onClick={() => setUseNewDevice(true)}
                style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: useNewDevice ? "1px solid #38bdf8" : "1px solid rgba(255,255,255,0.1)",
                  background: useNewDevice ? "rgba(56,189,248,0.15)" : "transparent",
                  color: useNewDevice ? "#38bdf8" : "#94a3b8",
                }}
              >
                + Yeni Cihaz
              </button>
            </div>

            {!useNewDevice ? (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>PLC Cihazı</label>
                <select
                  value={plcForm.plcId}
                  onChange={(e) => setPlcForm({ ...plcForm, plcId: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13 }}
                >
                  <option value="">Cihaz seçin...</option>
                  {plcDevices.map((d) => (
                    <option key={d.plcId} value={d.plcId}>{d.plcName} ({d.plcIp})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
                <input
                  placeholder="Cihaz Adı (örn: Kümes 1 PLC)"
                  value={plcForm.plcName}
                  onChange={(e) => setPlcForm({ ...plcForm, plcName: e.target.value })}
                  style={{ padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13 }}
                />
                <input
                  placeholder="IP Adresi (192.168.1.10)"
                  value={plcForm.plcIp}
                  onChange={(e) => setPlcForm({ ...plcForm, plcIp: e.target.value })}
                  style={{ padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13, fontFamily: "monospace" }}
                />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input
                    type="number" placeholder="Rack"
                    value={plcForm.rack}
                    onChange={(e) => setPlcForm({ ...plcForm, rack: Number(e.target.value) })}
                    style={{ padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13 }}
                  />
                  <input
                    type="number" placeholder="Slot"
                    value={plcForm.slot}
                    onChange={(e) => setPlcForm({ ...plcForm, slot: Number(e.target.value) })}
                    style={{ padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13 }}
                  />
                  <select
                    value={plcForm.plcCpuType}
                    onChange={(e) => setPlcForm({ ...plcForm, plcCpuType: e.target.value })}
                    style={{ padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 12 }}
                  >
                    {CPU_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>DB Numarası</label>
                <input
                  type="number"
                  value={plcForm.dbNumber}
                  onChange={(e) => setPlcForm({ ...plcForm, dbNumber: Number(e.target.value) })}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Veri Tipi</label>
                <select
                  value={plcForm.dataType}
                  onChange={(e) => setPlcForm({ ...plcForm, dataType: e.target.value })}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                >
                  {DATA_TYPES.map((dt) => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Byte Offset</label>
                <input
                  type="number"
                  value={plcForm.byteOffset}
                  onChange={(e) => setPlcForm({ ...plcForm, byteOffset: Number(e.target.value) })}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "#020617", color: "#e2e8f0", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={closePlcModal}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.15)", background: "transparent", color: "#94a3b8", fontSize: 13, cursor: "pointer" }}
              >
                Vazgeç
              </button>
              <button
                onClick={handleSavePlcAssignment}
                disabled={plcSaving}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#0284c7", color: "white", fontSize: 13, fontWeight: 600, cursor: plcSaving ? "not-allowed" : "pointer", opacity: plcSaving ? 0.6 : 1 }}
              >
                {plcSaving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}