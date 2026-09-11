"use client";

import { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Radio, 
  FileBarChart, 
  Bell, 
  Settings, 
  Users, 
  ClipboardList, 
  Monitor,
  Cpu,
  Mail,
  Bird
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

// Tek dizide tutuluyor ki sıralama, kimin admin olup olmadığından bağımsız
// her zaman aynı kalsın - önceki halde admin öğeleri ayrı dizide sona ekleniyordu,
// bu da gruplamayı bozuyordu (örn. PLC Kontrol, Sensörler'den kopuk duruyordu).
const allMenuItems = [
  // İzleme / canlı kontrol
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", adminOnly: false },
  { id: "scada", label: "SCADA Sistemi", icon: Monitor, href: "/scada", adminOnly: false },
  { id: "sensors", label: "Sensörler", icon: Radio, href: "/sensors", adminOnly: false },
  { id: "plc-control", label: "PLC Kontrol", icon: Cpu, href: "/plc", adminOnly: true },

  // Analiz / geçmişe bakış
  { id: "alerts", label: "Alarmlar", icon: Bell, href: "/alerts", adminOnly: false },
  { id: "reports", label: "Raporlama", icon: FileBarChart, href: "/reports", adminOnly: false },
  { id: "flocks", label: "Sürüler", icon: Bird, href: "/flocks", adminOnly: false },

  // İnsan / görev yönetimi
  { id: "assignments", label: "Görevlendirme", icon: ClipboardList, href: "/assignments", adminOnly: true },
  { id: "employees", label: "Çalışanlar", icon: Users, href: "/users", adminOnly: false },
  { id: "messages", label: "Mesajlar", icon: Mail, href: "/messages", adminOnly: false },
];

const bottomItems = [
  { id: "settings", label: "Ayarlar", icon: Settings, href: "/settings" },
];

export default function SideBar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    setRole(localStorage.getItem("mockRole"));
  }, []);

  const menuItems = role === "admin"
    ? allMenuItems
    : allMenuItems.filter((item) => !item.adminOnly);

  function renderItem(item: (typeof allMenuItems)[number] | (typeof bottomItems)[number]) {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    return (
      <Link
        key={item.id}
        href={item.href}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,0.05)";
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = "transparent";
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          marginBottom: 4,
          cursor: "pointer",
          position: "relative",
          borderRadius: 10,
          background: isActive ? "rgba(37, 99, 235, 0.15)" : "transparent",
          transition: "background 0.2s ease",
          textDecoration: "none",
        }}
      >
        {isActive && (
          <div
            style={{
              position: "absolute",
              left: -16,
              top: "50%",
              transform: "translateY(-50%)",
              width: 4,
              height: 24,
              background: "#3b82f6",
              borderRadius: "0 6px 6px 0",
            }}
          />
        )}
        <Icon size={20} color={isActive ? "#60a5fa" : "#9ca3af"} />
        <span style={{ fontSize: 15, color: isActive ? "white" : "#d1d5db", fontWeight: isActive ? 600 : 400 }}>
          {item.label}
        </span>
      </Link>
    );
  }

  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        background: "#0f172a",
        borderRight: "1px solid #1e293b",
        height: "100vh",
        color: "white",
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 8px", marginBottom: 40 }}>
        <Image src="/logo.png" alt="Kümes Otomasyonu" width={44} height={44} style={{ flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.5px", color: "#f8fafc" }}>
            Kümes Otomasyonu
          </span>
          <span style={{ fontSize: 11, color: "#64748b", fontWeight: 500 }}>
            Yönetim Paneli
          </span>
        </div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {menuItems.map(renderItem)}
      </nav>

      <div style={{ marginTop: "auto" }}>
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "16px 8px" }} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {bottomItems.map(renderItem)}
        </nav>
        <p style={{ fontSize: 12, color: "#4b5563", padding: "16px 16px 0", margin: 0, textAlign: "center" }}>
          Sistem Aktif
        </p>
      </div>
    </aside>
  );
}