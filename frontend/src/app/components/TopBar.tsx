"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Activity, MapPin, Clock, UserCog, LogOut, User, Check, Home } from "lucide-react";
import { mockCoops } from "../Data/mockCoop";
import { useCoop } from "../Data/CoopContext";

type Notification = {
  notificationId: number;
  userId: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
};

export default function TopBar() {
  const router = useRouter();
  const { selectedCoopId, setSelectedCoopId } = useCoop();
  const [role, setRole] = useState<string>("viewer");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [coopMenuOpen, setCoopMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifError, setNotifError] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const storedRole = localStorage.getItem("mockRole") ?? "viewer";
    setRole(storedRole);
    const storedUsername = localStorage.getItem("mockUsername");
    const storedUserId = localStorage.getItem("mockUserId");
    if (storedUsername) setUsername(storedUsername);
    if (storedUserId) setUserId(storedUserId);

    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;

    async function fetchNotifications() {
      try {
        const res = await fetch(`https://localhost:7069/api/notification/user/${userId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setNotifications(await res.json());
        setNotifError(false);
      } catch (err) {
        console.error("Bildirimler alınamadı:", err);
        setNotifError(true);
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [userId]);

  async function handleMarkAsRead(notificationId: number) {
    try {
      await fetch(`https://localhost:7069/api/notification/${notificationId}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error("Bildirim güncellenemedi:", err);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function handleLogout() {
    localStorage.removeItem("mockRole");
    localStorage.removeItem("mockUsername");
    localStorage.removeItem("mockUserId");
    router.push("/login");
  }

  const roleLabel =
    role === "admin"      ? "Yönetici Yetkisi"  :
    role === "operator"   ? "Operatör Yetkisi"  :
    role === "technician" ? "Teknisyen Yetkisi" :
                            "İzleyici Yetkisi";
  const initials = username.slice(0, 2).toUpperCase() || "PY";
  const selectedCoop = mockCoops.find((c) => c.id === selectedCoopId);

  const formattedTime = mounted
    ? currentTime.toLocaleString("tr-TR", {
        day: "numeric",
        month: "long",
        weekday: "long",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Yükleniyor...";

  return (
    <header
      style={{
        height: 60,
        background: "white",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        position: "relative",
        gap: 12,
      }}
    >
      {/* SOL GRUP: Sistem Aktif Rozeti & Kümes Seçici */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flexShrink: 1 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#dcfce7",
            color: "#15803d",
            padding: "4px 10px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <Activity size={14} />
          <span>SİSTEM AKTİF</span>
        </div>

        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            onClick={() => setCoopMenuOpen(!coopMenuOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              background: coopMenuOpen ? "#e5e7eb" : "#f3f4f6",
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = coopMenuOpen ? "#e5e7eb" : "#f3f4f6")}
          >
            <MapPin size={18} color="#059669" />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#1f2937" }}>
              {selectedCoop
                ? `${selectedCoop.name} (${selectedCoop.currentCount}/${selectedCoop.capacity} tavuk)`
                : "Tüm Kümesler"}
            </span>
            <ChevronDown
              size={16}
              color="#6b7280"
              style={{
                transform: coopMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </div>

          {coopMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 48,
                left: 0,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                width: 240,
                padding: "8px",
                zIndex: 50,
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9ca3af",
                  padding: "4px 8px 8px 8px",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Kayıtlı Kümesler
              </div>

              {mockCoops.map((coop) => {
                const isSelected = coop.id === selectedCoopId;

                return (
                  <div
                    key={coop.id}
                    onClick={() => {
                      setSelectedCoopId(coop.id);
                      setCoopMenuOpen(false);
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = "transparent";
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      background: isSelected ? "#ecfdf5" : "transparent",
                      color: isSelected ? "#059669" : "#4b5563",
                      fontWeight: isSelected ? 600 : 500,
                      transition: "background 0.2s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Home size={16} color={isSelected ? "#059669" : "#9ca3af"} />
                      <span style={{ fontSize: 13 }}>{coop.name}</span>
                    </div>

                    {isSelected && <Check size={16} color="#059669" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ORTA GRUP: Kullanıcı Adı, Yetki ve Canlı Saat */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#374151" }}>
          <User size={16} color="#9ca3af" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{username || "Misafir"}</span>
        </div>

        <div style={{ width: 1, height: 24, background: "#e5e7eb" }}></div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#4b5563" }}>
          <UserCog size={16} />
          <span style={{ fontSize: 13, fontWeight: 500 }}>{roleLabel}</span>
        </div>

        <div style={{ width: 1, height: 24, background: "#e5e7eb" }}></div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#2563eb", fontSize: 13, fontWeight: 600, background: "#eff6ff", padding: "6px 12px", borderRadius: 8 }}>
          <Clock size={16} />
          <span>{formattedTime}</span>
        </div>
      </div>

      {/* SAĞ GRUP: Bildirimler ve Kullanıcı Menüsü */}
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
        <div style={{ position: "relative" }}>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setNotifMenuOpen(!notifMenuOpen)}>
            <Bell size={20} color="#4b5563" />
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -6,
                  background: "#ef4444",
                  color: "white",
                  fontSize: 10,
                  borderRadius: "50%",
                  width: 16,
                  height: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "bold",
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>

          {notifMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 32,
                right: 0,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                width: 300,
                maxHeight: 360,
                overflowY: "auto",
                zIndex: 20,
              }}
            >
              <div style={{ padding: "10px 14px", fontSize: 13, fontWeight: 600, borderBottom: "1px solid #f3f4f6" }}>
                Bildirimler
              </div>

              {notifError ? (
                <p style={{ padding: "20px 14px", fontSize: 13, color: "#b91c1c", textAlign: "center" }}>
                  Sunucuya bağlanılamadı.
                </p>
              ) : notifications.length === 0 ? (
                <p style={{ padding: "20px 14px", fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
                  Henüz bildirim yok.
                </p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.notificationId}
                    onClick={() => !n.isRead && handleMarkAsRead(n.notificationId)}
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid #f9fafb",
                      cursor: n.isRead ? "default" : "pointer",
                      background: n.isRead ? "white" : "#eff6ff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                      <p style={{ fontSize: 12, margin: 0, color: "#374151" }}>{n.message}</p>
                      {!n.isRead && (
                        <div
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "#2563eb",
                            flexShrink: 0,
                            marginTop: 4,
                          }}
                        />
                      )}
                    </div>
                    <p style={{ fontSize: 10, color: "#9ca3af", margin: "4px 0 0" }}>
                      {new Date(n.createdAt).toLocaleString("tr-TR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ position: "relative" }}>
          <div
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#2563eb",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {initials}
            </div>
            <ChevronDown size={14} color="#9ca3af" />
          </div>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: 44,
                right: 0,
                background: "white",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                width: 180,
                padding: 8,
                zIndex: 10,
              }}
            >
              <div style={{ padding: "8px 10px", fontSize: 13, color: "#6b7280", borderBottom: "1px solid #f3f4f6", marginBottom: 4 }}>
                {username || "Personel"} · {roleLabel}
              </div>
              <div
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 6,
                  fontSize: 13,
                  color: "#b91c1c",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <LogOut size={15} />
                Çıkış Yap
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}