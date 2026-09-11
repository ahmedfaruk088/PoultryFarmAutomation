"use client";

import { useState, useEffect } from "react";
import SensorCard from "@/app/components/SensorCard";
import SensorModal from "@/app/components/SensorModal";
import { getStatus, Sensor } from "../Data/mockSensor";
import { Search } from "lucide-react";

export default function SensorDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [liveSensors, setLiveSensors] = useState<Sensor[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("https://localhost:7069/api/sensor/live");
        const data = await res.json();
        setLiveSensors(data);
      } catch (err) {
        console.error("Backend'e ulaşılamadı:", err);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const searchMatchedSensors = liveSensors.filter((sensor) =>
    sensor.sensorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sensor.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSensors = searchMatchedSensors.filter((sensor) => {
    if (activeFilter === "all") return true;
    return getStatus(sensor) === activeFilter;
  });

  const totalCount = searchMatchedSensors.length;
  const alarmCount = searchMatchedSensors.filter((s) => getStatus(s) === "alarm").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <div
          onClick={() => setActiveFilter("all")}
          style={{
            background: "white",
            borderRadius: 10,
            padding: "12px 20px",
            cursor: "pointer",
            border: activeFilter === "all" ? "2px solid #2563eb" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Listelenen Sensör</p>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{totalCount}</p>
        </div>

        <div
          onClick={() => setActiveFilter("alarm")}
          style={{
            background: "white",
            borderRadius: 10,
            padding: "12px 20px",
            cursor: "pointer",
            border: activeFilter === "alarm" ? "2px solid #ef4444" : "2px solid transparent",
            transition: "all 0.2s ease",
          }}
        >
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Alarm Durumunda</p>
          <p style={{ fontSize: 22, fontWeight: 600, margin: 0, color: alarmCount > 0 ? "#b91c1c" : "#111827" }}>
            {alarmCount}
          </p>
        </div>
      </div>

      <div
        style={{
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "white",
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          width: "300px",
        }}
      >
        <Search size={18} color="#9ca3af" />
        <input
          type="text"
          placeholder="Sensör ara (örn: Kümes, Sıcaklık vb.)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: "none", outline: "none", width: "100%", fontSize: 14 }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 12 }}>
        {filteredSensors.map((sensor) => (
          <SensorCard key={sensor.sensorId} sensor={sensor} onClick={() => setSelectedSensor(sensor)} />
        ))}
      </div>

      {filteredSensors.length === 0 && (
        <p style={{ textAlign: "center", color: "#6b7280", marginTop: 40 }}>
          Aranan kriterlere uygun sensör bulunamadı.
        </p>
      )}

      <SensorModal sensor={selectedSensor} onClose={() => setSelectedSensor(null)} />
    </div>
  );
}