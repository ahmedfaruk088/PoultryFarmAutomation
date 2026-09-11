"use client";

import { useEffect, useState } from "react";
import { useCoop } from "../../Data/CoopContext";
import { CheckCircle2, Droplets, Wheat, Egg as EggIcon, AlertTriangle } from "lucide-react";

type TaskItem = {
  taskId: number;
  sensorId: string;
  coopId: string;
  taskType: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  completedByUserId: string | null;
  addedAmount: number | null;
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
  waterCapacityLiters: number | null;
  feedCapacityKg: number | null;
};

type EggRecord = {
  recordId: number;
  coopId: string;
  date: string;
  totalEggs: number;
  brokenEggs: number;
};

export default function ReportsPage() {
  const { selectedCoopId } = useCoop();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [liveSensors, setLiveSensors] = useState<LiveSensor[]>([]);
  const [coops, setCoops] = useState<Coop[]>([]);
  const [todayEggs, setTodayEggs] = useState<EggRecord | null>(null);

  useEffect(() => {
    async function fetchAll() {
      try {
        const [taskRes, sensorRes, coopRes] = await Promise.all([
          fetch("https://localhost:7069/api/task"),
          fetch("https://localhost:7069/api/sensor/live"),
          fetch("https://localhost:7069/api/coop"),
        ]);
        setTasks(await taskRes.json());
        setLiveSensors(await sensorRes.json());
        setCoops(await coopRes.json());
      } catch (err) {
        console.error("Veri alınamadı:", err);
      }
    }

    fetchAll();
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedCoopId) {
      setTodayEggs(null);
      return;
    }

    async function fetchEggs() {
      try {
        const res = await fetch(`https://localhost:7069/api/eggproduction/coop/${selectedCoopId}/today`);
        const data = await res.json();
        setTodayEggs(data);
      } catch (err) {
        console.error("Yumurta verisi alınamadı:", err);
      }
    }

    fetchEggs();
    const interval = setInterval(fetchEggs, 10000);
    return () => clearInterval(interval);
  }, [selectedCoopId]);

  const completedTasks = tasks
    .filter((t) => t.status === "Tamamlandı")
    .filter((t) => !selectedCoopId || t.coopId === selectedCoopId)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  const allCoopTasks = tasks
    .filter((t) => !selectedCoopId || t.coopId === selectedCoopId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const relevantSensors = liveSensors.filter((s) => !selectedCoopId || s.coopId === selectedCoopId);
  const waterSensor = relevantSensors.find((s) => s.type === "Su Seviyesi");
  const feedSensor = relevantSensors.find((s) => s.type === "Yem Seviyesi");
  const coop = coops.find((c) => c.coopId === selectedCoopId);

  const waterPercent = waterSensor?.value ?? null;
  const feedPercent = feedSensor?.value ?? null;
  const waterLiters = waterPercent !== null && coop?.waterCapacityLiters
    ? (waterPercent / 100) * coop.waterCapacityLiters
    : null;
  const feedKg = feedPercent !== null && coop?.feedCapacityKg
    ? (feedPercent / 100) * coop.feedCapacityKg
    : null;

  const brokenRate = todayEggs && todayEggs.totalEggs > 0
    ? ((todayEggs.brokenEggs / todayEggs.totalEggs) * 100).toFixed(1)
    : null;

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Raporlama</h1>
      <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
        {selectedCoopId ? "Seçili kümes için" : "Kümes seçin, tank durumunu görün"} güncel durum ve geçmiş
      </p>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div style={{ background: "white", borderRadius: 10, padding: "14px 20px", border: "1px solid #eef0f2", flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Droplets size={16} color="#2563eb" />
            <span style={{ fontSize: 12, color: "#6b7280" }}>Kalan Su Seviyesi</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {waterPercent !== null ? `${waterPercent.toFixed(1)}%` : "-"}
          </p>
          {waterLiters !== null && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>≈ {waterLiters.toFixed(0)} L</p>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 10, padding: "14px 20px", border: "1px solid #eef0f2", flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Wheat size={16} color="#b45309" />
            <span style={{ fontSize: 12, color: "#6b7280" }}>Kalan Yem Seviyesi</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {feedPercent !== null ? `${feedPercent.toFixed(1)}%` : "-"}
          </p>
          {feedKg !== null && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>≈ {feedKg.toFixed(0)} kg</p>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 10, padding: "14px 20px", border: "1px solid #eef0f2", flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <EggIcon size={16} color="#ca8a04" />
            <span style={{ fontSize: 12, color: "#6b7280" }}>Bugünkü Yumurta</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
            {todayEggs ? todayEggs.totalEggs : "-"}
          </p>
          {brokenRate !== null && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0" }}>
              {todayEggs?.brokenEggs} kırık (%{brokenRate})
            </p>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 10, padding: "14px 20px", border: "1px solid #eef0f2", flex: 1, minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <CheckCircle2 size={16} color="#15803d" />
            <span style={{ fontSize: 12, color: "#6b7280" }}>Tamamlanan İşlem</span>
          </div>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{completedTasks.length}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>İşlem Geçmişi</h2>
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", overflow: "hidden", marginBottom: 28 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eef0f2" }}>
              <th style={thStyle}>İşlem</th>
              <th style={thStyle}>Kümes</th>
              <th style={thStyle}>Eklenen Miktar</th>
              <th style={thStyle}>Yapan</th>
              <th style={thStyle}>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {completedTasks.map((task) => (
              <tr key={task.taskId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 8 }}>
                  {task.taskType === "SuEkle" ? <Droplets size={14} color="#2563eb" /> : <Wheat size={14} color="#b45309" />}
                  {task.taskType === "SuEkle" ? "Su Ekleme" : "Yem Ekleme"}
                </td>
                <td style={tdStyle}>{task.coopId}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{task.addedAmount}%</td>
                <td style={tdStyle}>{task.completedByUserId || "-"}</td>
                <td style={tdStyle}>{task.completedAt ? new Date(task.completedAt).toLocaleString("tr-TR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {completedTasks.length === 0 && (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 13 }}>
            Henüz tamamlanmış bir işlem yok.
          </p>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
        <AlertTriangle size={16} color="#dc2626" /> Alarm Raporları
      </h2>
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eef0f2" }}>
              <th style={thStyle}>Alarm Tipi</th>
              <th style={thStyle}>Kümes</th>
              <th style={thStyle}>Tetiklenme</th>
              <th style={thStyle}>Durum</th>
              <th style={thStyle}>İlgilenen</th>
              <th style={thStyle}>Giderilme</th>
            </tr>
          </thead>
          <tbody>
            {allCoopTasks.map((task) => (
              <tr key={task.taskId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ ...tdStyle, display: "flex", alignItems: "center", gap: 8 }}>
                  {task.taskType === "SuEkle" ? <Droplets size={14} color="#2563eb" /> : <Wheat size={14} color="#b45309" />}
                  {task.taskType === "SuEkle" ? "Su Kritik" : "Yem Kritik"}
                </td>
                <td style={tdStyle}>{task.coopId}</td>
                <td style={tdStyle}>{new Date(task.createdAt).toLocaleString("tr-TR")}</td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "3px 9px",
                      borderRadius: 20,
                      background: task.status === "Tamamlandı" ? "#e8f3ec" : "#fee2e2",
                      color: task.status === "Tamamlandı" ? "#276240" : "#b91c1c",
                    }}
                  >
                    {task.status}
                  </span>
                </td>
                <td style={tdStyle}>{task.completedByUserId || "-"}</td>
                <td style={tdStyle}>{task.completedAt ? new Date(task.completedAt).toLocaleString("tr-TR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {allCoopTasks.length === 0 && (
          <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 13 }}>
            Henüz alarm kaydı yok.
          </p>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = { textAlign: "left", padding: "10px 16px", fontSize: 12, color: "#6b7280", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "12px 16px", fontSize: 13 };