"use client";

import { useState, useEffect } from "react";
import { Server, Plus, Trash2, X, Zap, Wifi, WifiOff, Loader2, CheckCircle2, XCircle } from "lucide-react";

interface PlcDevice {
  plcId: string;
  plcName: string;
  plcIp: string;
  rack: number;
  slot: number;
  plcCpuType: string;
  coopId: string;
  isActive: boolean;
  lastConnectedTime: string | null;
  isConnected: boolean;
}

interface SensorOption {
  sensorId: string;
  sensorName: string;
  type: string;
  coopId: string;
  plcId: string | null;
}

interface Coop {
  coopId: string;
  coopName: string;
}

const DATA_TYPES = [
  { value: "Bool", label: "Bool (1 bit)", hint: "Açık/kapalı, motor durumu" },
  { value: "Int", label: "Int (16 bit)", hint: "Tam sayı" },
  { value: "Word", label: "Word (16 bit)", hint: "İşaretsiz tam sayı" },
  { value: "Real", label: "Real (32 bit)", hint: "Ondalıklı sayı, sıcaklık/nem" },
];

const CPU_TYPES = ["S71200", "S71500", "S7300", "S7400"];

function isValidIp(ip: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}

function generateS7Preview(db: number, type: string, byteOffset: number, bitOffset: number) {
  let addr = `DB${db}.`;
  if (type === "Real") addr += `DBD${byteOffset}`;
  else if (type === "Int" || type === "Word") addr += `DBW${byteOffset}`;
  else if (type === "Bool") addr += `DBX${byteOffset}.${bitOffset}`;
  else addr += `DBB${byteOffset}`;
  return addr;
}

export default function PlcPage() {
  const [devices, setDevices] = useState<PlcDevice[]>([]);
  const [sensors, setSensors] = useState<SensorOption[]>([]);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: "success" | "error" | "loading"; text: string } | null>(null);

  const [form, setForm] = useState({
    plcName: "",
    plcIp: "",
    rack: 0,
    slot: 1,
    plcCpuType: "S71200",
    coopId: "",
    sensorId: "",
    dbNumber: 1,
    dataType: "Real",
    byteOffset: 0,
    bitOffset: 0,
  });

  async function fetchAll() {
    try {
      const [deviceRes, sensorRes, coopRes] = await Promise.all([
        fetch("https://localhost:7069/api/plcdevice"),
        fetch("https://localhost:7069/api/sensor"),
        fetch("https://localhost:7069/api/coop"),
      ]);
      setDevices(await deviceRes.json());
      setSensors(await sensorRes.json());
      setCoops(await coopRes.json());
    } catch (err) {
      console.error("Veri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const handleTest = async () => {
    const cleanIp = form.plcIp.trim();
    if (!isValidIp(cleanIp)) {
      setTestMessage({ type: "error", text: "Geçerli bir IP adresi girin (örn. 192.168.1.10)." });
      return;
    }
    setTestMessage({ type: "loading", text: "Bağlantı test ediliyor..." });

    try {
      const res = await fetch("https://localhost:7069/api/plcdevice/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: cleanIp,
          rack: form.rack,
          slot: form.slot,
          cpuType: form.plcCpuType,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setTestMessage({ type: "success", text: "Bağlantı başarılı." });
      } else {
        setTestMessage({ type: "error", text: data.error || "Bağlantı kurulamadı." });
      }
    } catch (err) {
      setTestMessage({ type: "error", text: "Sunucuya ulaşılamadı." });
    }
  };

  async function handleSave() {
    const cleanIp = form.plcIp.trim();
    if (!form.plcName.trim() || !cleanIp || !form.coopId) {
      setTestMessage({ type: "error", text: "Cihaz adı, IP ve kümes seçimi zorunludur." });
      return;
    }
    if (!isValidIp(cleanIp)) {
      setTestMessage({ type: "error", text: "Geçerli bir IP adresi girin." });
      return;
    }
    if (!form.sensorId) {
      setTestMessage({ type: "error", text: "Bu veri noktasının hangi sensöre ait olduğunu seçmelisiniz." });
      return;
    }

    try {
      let plcId = devices.find((d) => d.plcIp === cleanIp)?.plcId;

      // PLC cihazı henüz kayıtlı değilse önce onu oluştur
      if (!plcId) {
        plcId = `plc-${Date.now()}`;
        await fetch("https://localhost:7069/api/plcdevice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plcId,
            plcName: form.plcName.trim(),
            plcIp: cleanIp,
            rack: form.rack,
            slot: form.slot,
            plcCpuType: form.plcCpuType,
            coopId: form.coopId,
            isActive: true,
          }),
        });
      }

      // Seçilen sensörü bu PLC'ye, girilen DB/byte/tip bilgisiyle bağla
      const assignRes = await fetch("https://localhost:7069/api/plcdevice/assign-sensor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sensorId: form.sensorId,
          plcId: plcId,
          dbNumber: form.dbNumber,
          startByte: form.byteOffset,
          dataType: form.dataType,
        }),
      });

      if (!assignRes.ok) {
        throw new Error(`Sensör eşleştirme başarısız (HTTP ${assignRes.status})`);
      }

      setShowForm(false);
      setTestMessage(null);
      setForm({ plcName: "", plcIp: "", rack: 0, slot: 1, plcCpuType: "S71200", coopId: "", sensorId: "", dbNumber: 1, dataType: "Real", byteOffset: 0, bitOffset: 0 });
      fetchAll();
    } catch (err) {
      console.error("Kayıt başarısız:", err);
      setTestMessage({ type: "error", text: "Kayıt sırasında hata oluştu." });
    }
  }

  async function handleDelete(plcId: string) {
    if (!confirm("Bu bağlantıyı silmek istediğinize emin misiniz?")) return;
    try {
      await fetch(`https://localhost:7069/api/plcdevice/${plcId}`, { method: "DELETE" });
      fetchAll();
    } catch (err) {
      console.error("Silme başarısız:", err);
    }
  }

  const isFormValid = form.plcName.trim() !== "" && isValidIp(form.plcIp.trim()) && form.coopId !== "" && form.sensorId !== "";

  // Seçilen kümese ait, henüz bu PLC'ye atanmamış sensörleri listele
  const availableSensors = sensors.filter((s) => !form.coopId || s.coopId === form.coopId);

  const styles = {
    container: { padding: "40px", maxWidth: "1000px", margin: "0 auto", fontFamily: "system-ui, sans-serif" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: showForm ? "24px" : "32px" },
    title: { fontSize: "24px", fontWeight: "700", color: "#0f172a", margin: "0 0 6px 0" },
    subtitle: { margin: 0, color: "#64748b", fontSize: "14px" },
    statsRow: { display: "flex", gap: "16px", marginBottom: "32px" },
    statCard: { flex: 1, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "16px 20px" },
    statLabel: { fontSize: "12px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" as const, letterSpacing: "0.03em", margin: "0 0 6px 0" },
    statValue: { fontSize: "22px", fontWeight: "700", color: "#0f172a", margin: 0 },
    btnPrimary: { background: "#2563eb", color: "white", border: "none", padding: "12px 20px", borderRadius: "8px", fontWeight: "500", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)" },
    btnTest: { background: "white", border: "1px solid #cbd5e1", color: "#475569", padding: "10px 16px", borderRadius: "8px", fontWeight: "500", cursor: "pointer", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" },
    btnSave: { background: "#0f172a", color: "white", border: "none", padding: "10px 24px", borderRadius: "8px", fontWeight: "500", cursor: "pointer", fontSize: "14px", opacity: isFormValid ? 1 : 0.4, transition: "opacity 0.15s" },
    formCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "24px", marginBottom: "40px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
    input: { width: "100%", boxSizing: "border-box" as const, padding: "10px 14px", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "14px", background: "white" },
    label: { display: "block", fontSize: "13px", fontWeight: "600", color: "#475569", marginBottom: "6px" },
    hint: { fontSize: "12px", color: "#94a3b8", margin: "4px 0 0 0" },
    listCard: { background: "white", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column" as const, gap: "16px", marginBottom: "16px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
    previewBox: { background: "#eff6ff", border: "1px dashed #93c5fd", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#1e3a8a", display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Bağlantı ve Sensör Yapılandırması</h1>
          <p style={styles.subtitle}>Sisteme bağlı Siemens donanımlarını ve veri adreslerini yapılandırın.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={styles.btnPrimary}>
            <Plus size={18} /> Yeni Cihaz/Veri Ekle
          </button>
        )}
      </div>

      {!loading && !showForm && (
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Kayıtlı Cihaz</p>
            <p style={styles.statValue}>{devices.length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Bağlı (Canlı)</p>
            <p style={{ ...styles.statValue, color: "#16a34a" }}>{devices.filter((d) => d.isConnected).length}</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statLabel}>Bağlı Değil</p>
            <p style={{ ...styles.statValue, color: devices.filter((d) => d.isActive && !d.isConnected).length > 0 ? "#ef4444" : "#0f172a" }}>
              {devices.filter((d) => d.isActive && !d.isConnected).length}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.formCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
              <Zap size={18} color="#2563eb" /> Yeni Donanım / Veri Noktası
            </h3>
            <button
              onClick={() => { setShowForm(false); setTestMessage(null); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "500" }}
            >
              <X size={16} /> Vazgeç
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "8px" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingRight: "10px", borderRight: "1px solid #e2e8f0" }}>
              <div>
                <label style={styles.label}>Cihaz Adı</label>
                <input style={styles.input} value={form.plcName} onChange={(e) => setForm({ ...form, plcName: e.target.value })} placeholder="Örn: Kümes 1 PLC" />
              </div>
              <div>
                <label style={styles.label}>Ağ İçi IP Adresi</label>
                <input style={{ ...styles.input, fontFamily: "monospace" }} value={form.plcIp} onChange={(e) => setForm({ ...form, plcIp: e.target.value })} placeholder="192.168.1.100" />
                <p style={styles.hint}>Aynı IP zaten kayıtlıysa, yeni veri noktası o cihaza eklenir.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div><label style={styles.label}>Rack</label><input style={styles.input} type="number" value={form.rack} onChange={(e) => setForm({ ...form, rack: Number(e.target.value) })} /></div>
                <div><label style={styles.label}>Slot</label><input style={styles.input} type="number" value={form.slot} onChange={(e) => setForm({ ...form, slot: Number(e.target.value) })} /></div>
              </div>
              <div>
                <label style={styles.label}>CPU Tipi</label>
                <select style={styles.input} value={form.plcCpuType} onChange={(e) => setForm({ ...form, plcCpuType: e.target.value })}>
                  {CPU_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingLeft: "10px" }}>
              <div>
                <label style={styles.label}>Hangi Kümese Bağlı</label>
                <select
                  style={styles.input}
                  value={form.coopId}
                  onChange={(e) => setForm({ ...form, coopId: e.target.value, sensorId: "" })}
                >
                  <option value="" disabled>Kümes seçin...</option>
                  {coops.map((c) => (
                    <option key={c.coopId} value={c.coopId}>{c.coopName}</option>
                  ))}
                </select>
                <p style={styles.hint}>Bu PLC'nin hizmet ettiği kümesi seçin.</p>
              </div>

              <div>
                <label style={styles.label}>Hangi Sensöre Ait</label>
                <select
                  style={styles.input}
                  value={form.sensorId}
                  onChange={(e) => setForm({ ...form, sensorId: e.target.value })}
                  disabled={!form.coopId}
                >
                  <option value="" disabled>Sensör seçin...</option>
                  {availableSensors.map((s) => (
                    <option key={s.sensorId} value={s.sensorId}>
                      {s.sensorName} ({s.type}){s.plcId ? " — zaten atanmış" : ""}
                    </option>
                  ))}
                </select>
                <p style={styles.hint}>
                  {form.coopId
                    ? "Bu veri adresi hangi sensörün değerini okuyacak?"
                    : "Önce kümes seçin, sensör listesi ona göre gelsin."}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <div><label style={styles.label}>DB Numarası</label><input style={styles.input} type="number" value={form.dbNumber} onChange={(e) => setForm({ ...form, dbNumber: Number(e.target.value) })} /></div>
                <div>
                  <label style={styles.label}>Veri Tipi</label>
                  <select style={styles.input} value={form.dataType} onChange={(e) => setForm({ ...form, dataType: e.target.value })}>
                    {DATA_TYPES.map((dt) => (
                      <option key={dt.value} value={dt.value}>{dt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: form.dataType === "Bool" ? "1fr 1fr" : "1fr", gap: "12px" }}>
                <div>
                  <label style={styles.label}>Byte Offset</label>
                  <input style={styles.input} type="number" value={form.byteOffset} onChange={(e) => setForm({ ...form, byteOffset: Number(e.target.value) })} />
                  <p style={styles.hint}>Başlangıç adresi</p>
                </div>
                {form.dataType === "Bool" && (
                  <div>
                    <label style={{ ...styles.label, color: "#166534" }}>Bit Offset (0-7)</label>
                    <input style={{ ...styles.input, borderColor: "#86efac", background: "#f0fdf4" }} type="number" min="0" max="7" value={form.bitOffset} onChange={(e) => setForm({ ...form, bitOffset: Number(e.target.value) })} />
                    <p style={styles.hint}>Byte içindeki spesifik bit</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.previewBox}>
            <span>Okuma Adresi: <strong style={{ fontFamily: "monospace", marginLeft: "8px", fontSize: "15px" }}>{generateS7Preview(form.dbNumber, form.dataType, form.byteOffset, form.bitOffset)}</strong></span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "20px", marginTop: "20px", borderTop: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button onClick={handleTest} style={styles.btnTest}>
                Bağlantıyı test et
              </button>
              {testMessage && testMessage.type !== "loading" && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: "500", color: testMessage.type === "success" ? "#16a34a" : "#ef4444" }}>
                  {testMessage.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {testMessage.text}
                </span>
              )}
              {testMessage?.type === "loading" && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", color: "#64748b" }}>
                  <Loader2 size={14} /> {testMessage.text}
                </span>
              )}
            </div>
            <button onClick={handleSave} style={styles.btnSave} disabled={!isFormValid}>Kayıt oluştur</button>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ color: "#64748b", display: "flex", gap: "8px", marginBottom: "20px", alignItems: "center" }}>
          <Loader2 size={18} /> Yükleniyor...
        </div>
      )}

      <div>
        {devices.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            Henüz eklenmiş bir PLC bağlantısı bulunmuyor.
          </div>
        )}

        {devices.map((plc) => {
          const linkedSensors = sensors.filter((s) => s.plcId === plc.plcId);

          return (
            <div key={plc.plcId} style={styles.listCard}>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div style={{ background: plc.isConnected ? "#dcfce7" : "#f1f5f9", padding: "12px", borderRadius: "12px", color: plc.isConnected ? "#16a34a" : "#94a3b8" }}>
                    <Server size={24} />
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <h3 style={{ margin: 0, fontSize: "16px", color: "#0f172a" }}>{plc.plcName}</h3>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "600", color: plc.isConnected ? "#16a34a" : "#94a3b8" }}>
                        {plc.isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
                        {plc.isConnected ? "Bağlı" : (plc.isActive ? "Bağlanamıyor" : "Pasif")}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "12px", fontSize: "13px", color: "#64748b" }}>
                      <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: "4px" }}>{plc.plcIp}</span>
                      <span style={{ fontWeight: "500", color: "#475569" }}>{linkedSensors.length} sensör bağlı</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(plc.plcId)}
                  style={{ background: "#fee2e2", border: "none", color: "#ef4444", padding: "10px", borderRadius: "8px", cursor: "pointer", display: "flex" }}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {linkedSensors.length > 0 && (
                <div style={{ borderTop: "1px dashed #e2e8f0", paddingTop: "16px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", color: "#64748b", margin: "0 0 12px 0", textTransform: "uppercase" }}>Bağlı Sensörler</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                    {linkedSensors.map((sensor) => (
                      <div key={sensor.sensorId} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 12px", borderRadius: "6px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>{sensor.type}</span>
                        <span style={{ fontSize: "12px", color: "#64748b", fontFamily: "monospace" }}>({sensor.sensorId})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>
    </div>
  );
}