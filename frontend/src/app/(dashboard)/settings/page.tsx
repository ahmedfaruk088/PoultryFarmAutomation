"use client";

import { useEffect, useState } from "react";
import { User, Shield, Bell, LogOut, Lock, Eye, EyeOff, Check, Hash, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

type Tab = "profile" | "security" | "notifications";

export default function SettingsPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [alarmNotif, setAlarmNotif] = useState(true);
  const [taskNotif, setTaskNotif] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("mockUsername");
    const storedRole = localStorage.getItem("mockRole");
    const storedUserId = localStorage.getItem("mockUserId") || "USR-2026-9042";
    
    if (storedUsername) setUsername(storedUsername);
    if (storedRole) setRole(storedRole);
    if (storedUserId) setUserId(storedUserId);
  }, []);

  const roleLabel =
    role === "admin" ? "Yönetici" : role === "operator" ? "Operatör" : "İzleyici";

  function handleLogout() {
    localStorage.removeItem("mockRole");
    localStorage.removeItem("mockUsername");
    localStorage.removeItem("mockUserId");
    router.push("/login");
  }

  async function handlePasswordSave() {
    setPasswordError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Yeni şifreler eşleşmiyor.");
      return;
    }

    const storedUserId = localStorage.getItem("mockUserId") || userId;
    if (!storedUserId) {
      setPasswordError("Kullanıcı kimliği bulunamadı, lütfen tekrar giriş yapın.");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch(`https://localhost:7069/api/user/change-password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: storedUserId,
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        // Backend "Mevcut şifre hatalı." veya "Kullanıcı bulunamadı." gibi düz metin dönüyor
        const message = await res.text();
        setPasswordError(message || "Şifre değiştirilemedi.");
        return;
      }

      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError("Sunucuya bağlanılamadı. Lütfen tekrar deneyin.");
    } finally {
      setPasswordSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "profile", label: "Profil Bilgileri", icon: User },
    { id: "security", label: "Güvenlik & Şifre", icon: Shield },
    { id: "notifications", label: "Bildirim Tercihleri", icon: Bell },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "40px 20px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        {/* Sayfa Başlığı */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a", letterSpacing: "-0.5px" }}>
            Hesap Ayarları
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: 0 }}>
            Kişisel bilgilerinizi, güvenlik ayarlarınızı ve tercihlerinizi yönetin.
          </p>
        </div>

        {/* Ana Layout: Simetrik Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, alignItems: "start" }}>
          
          {/* SOL MENÜ KARTI */}
          <div
            style={{
              background: "white",
              borderRadius: 20,
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
              overflow: "hidden",
            }}
          >
            {/* Profil Özeti */}
            <div style={{ padding: "32px 20px 24px", textAlign: "center", background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)", borderBottom: "1px solid #f1f5f9" }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  boxShadow: "0 8px 20px -6px rgba(37,99,235,0.4)"
                }}
              >
                <User size={36} strokeWidth={2} />
              </div>
              <p style={{ fontWeight: 700, fontSize: 18, color: "#0f172a", margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>
                {username || "Misafir Kullanıcı"}
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 24,
                  background: "#f1f5f9",
                  color: "#475569",
                  letterSpacing: "0.5px"
                }}
              >
                {roleLabel}
              </span>
            </div>

            {/* Navigasyon Sekmeleri */}
            <div style={{ padding: "16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 16px",
                      borderRadius: 12,
                      border: "none",
                      background: isActive ? "#eff6ff" : "transparent",
                      color: isActive ? "#2563eb" : "#475569",
                      fontSize: 14,
                      fontWeight: isActive ? 600 : 500,
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "#f8fafc" }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                      {tab.label}
                    </div>
                    {isActive && <ChevronRight size={16} />}
                  </button>
                );
              })}

              <div style={{ height: 1, background: "#f1f5f9", margin: "12px 8px" }} />

              <button
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "transparent",
                  color: "#ef4444",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fef2f2"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <LogOut size={18} strokeWidth={2} />
                Oturumu Kapat
              </button>
            </div>
          </div>

          {/* SAĞ İÇERİK KARTI */}
          <div
            style={{
              background: "white",
              borderRadius: 20,
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.05)",
              border: "1px solid #f1f5f9",
              padding: "40px",
              minHeight: 520,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === "profile" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a", letterSpacing: "-0.5px" }}>Profil Detayları</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 32px 0" }}>
                  Sisteme kayıtlı temel kimlik bilgileriniz. Bu bilgiler salt okunurdur.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <ReadOnlyRow icon={Hash} label="Kullanıcı ID" value={userId || "-"} isMono />
                  <ReadOnlyRow icon={User} label="Kullanıcı Adı" value={username || "-"} />
                  <ReadOnlyRow icon={Shield} label="Erişim Yetkisi" value={roleLabel} />
                </div>

                <div style={{ marginTop: 32, padding: "16px 20px", background: "#f8fafc", borderRadius: 12, borderLeft: "4px solid #38bdf8", display: "flex", alignItems: "center", gap: 12 }}>
                  <Shield size={20} color="#38bdf8" />
                  <p style={{ fontSize: 13, color: "#475569", margin: 0, lineHeight: 1.5 }}>
                    Profil bilgileriniz kurumsal kimlik politikaları gereği koruma altındadır. Değişiklik talepleri için sistem yöneticinizle görüşün.
                  </p>
                </div>
              </div>
            )}

            {activeTab === "security" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a", letterSpacing: "-0.5px" }}>Güvenlik & Şifre</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 32px 0" }}>
                  Hesap güvenliğinizi korumak için şifrenizi düzenli olarak güncelleyin.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 460 }}>
                  <PasswordInput
                    label="Mevcut Şifre"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    showPassword={showPassword}
                  />
                  <PasswordInput
                    label="Yeni Şifre"
                    value={newPassword}
                    onChange={setNewPassword}
                    showPassword={showPassword}
                  />
                  <PasswordInput
                    label="Yeni Şifre (Tekrar)"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    showPassword={showPassword}
                    onToggleVisibility={() => setShowPassword(!showPassword)}
                  />

                  {passwordError && (
                    <p style={{ fontSize: 13, color: "#ef4444", margin: 0, fontWeight: 500 }}>
                      {passwordError}
                    </p>
                  )}

                  <button
                    onClick={handlePasswordSave}
                    disabled={passwordSaving}
                    style={{
                      marginTop: 16,
                      padding: "16px",
                      borderRadius: 12,
                      border: "none",
                      background: passwordSaved ? "#10b981" : "#0f172a",
                      color: "white",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: passwordSaving ? "default" : "pointer",
                      opacity: passwordSaving ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      transition: "all 0.3s ease",
                      boxShadow: passwordSaved ? "0 4px 12px rgba(16,185,129,0.3)" : "0 4px 12px rgba(15,23,42,0.2)",
                    }}
                  >
                    {passwordSaving ? (
                      "Kaydediliyor..."
                    ) : passwordSaved ? (
                      <>
                        <Check size={18} /> Şifre Başarıyla Kaydedildi
                      </>
                    ) : (
                      "Değişiklikleri Kaydet"
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div style={{ animation: "fadeIn 0.3s ease" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px 0", color: "#0f172a", letterSpacing: "-0.5px" }}>Bildirim Tercihleri</h2>
                <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 32px 0" }}>
                  Sistemdeki gelişmelerden nasıl haberdar olmak istediğinizi özelleştirin.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <ToggleRow
                    label="Kritik Alarm Bildirimleri"
                    description="Sensör eşik değerleri (sıcaklık, amonyak vb.) aşıldığında anlık ve öncelikli bildirim alırsınız."
                    checked={alarmNotif}
                    onChange={setAlarmNotif}
                  />
                  <ToggleRow
                    label="Operasyonel Görevler"
                    description="Yeni bir bakım veya kontrol görevi atandığında bilgilendirilirsiniz."
                    checked={taskNotif}
                    onChange={setTaskNotif}
                  />
                  <ToggleRow
                    label="Günlük Sistem Raporu"
                    description="Her gün saat 18:00'da kümesteki genel verimliliği özetleyen raporu alırsınız."
                    checked={dailyReport}
                    onChange={setDailyReport}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Sadece sekmeler arası geçiş animasyonu için ufak bir stil */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// --- YARDIMCI BİLEŞENLER (Temiz kod ve simetri için) ---

function ReadOnlyRow({ icon: Icon, label, value, isMono = false }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderRadius: 14, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Icon size={18} color="#64748b" />
        <span style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", fontFamily: isMono ? "monospace" : "inherit", letterSpacing: isMono ? "1px" : "normal" }}>
          {value}
        </span>
        <Lock size={14} color="#94a3b8" />
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, showPassword, onToggleVisibility }: any) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "#475569", display: "block", marginBottom: 8 }}>
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, border: "2px solid #e2e8f0", borderRadius: 12, padding: "14px 16px", background: "white", transition: "border 0.2s ease" }}
           onFocus={(e) => e.currentTarget.style.borderColor = "#38bdf8"}
           onBlur={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}>
        <Lock size={18} color="#94a3b8" />
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          style={{ border: "none", outline: "none", flex: 1, fontSize: 15, color: "#0f172a", background: "transparent" }}
        />
        {onToggleVisibility && (
          <button
            onClick={onToggleVisibility}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", color: "#64748b", padding: 0 }}
            title="Şifreyi Göster/Gizle"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: any) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        background: checked ? "#f8fafc" : "white",
        cursor: "pointer",
        transition: "all 0.2s ease"
      }}
      onMouseEnter={(e) => e.currentTarget.style.borderColor = "#cbd5e1"}
      onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
    >
      <div style={{ paddingRight: 24 }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#0f172a" }}>{label}</p>
        <p style={{ fontSize: 13, color: "#64748b", margin: "6px 0 0", lineHeight: 1.5 }}>{description}</p>
      </div>
      <div
        style={{
          width: 50,
          height: 28,
          borderRadius: 30,
          background: checked ? "#2563eb" : "#e2e8f0",
          position: "relative",
          transition: "background 0.3s ease",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "white",
            position: "absolute",
            top: 2,
            left: checked ? 24 : 2,
            transition: "left 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        />
      </div>
    </div>
  );
}