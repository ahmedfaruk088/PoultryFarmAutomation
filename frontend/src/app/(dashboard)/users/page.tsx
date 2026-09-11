"use client";

import { useEffect, useState } from "react";
import {
  Users, Plus, Pencil, X, Check,
  Mail, Phone, MapPin, Shield, LayoutGrid, List, Search, UserCircle2,
} from "lucide-react";

// ── Tipler ────────────────────────────────────────────────────────────────────

type UserAccount = {
  personID: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  // API'den "Admin", "admin", "ADMIN" gibi farklı case'ler gelebilir; her yerde
  // normalizeRole() geçirilerek lowercase kullanılır.
  role: string | null;
  location: string | null;
};

// ── Rol yardımcıları ──────────────────────────────────────────────────────────

const roleOptions = ["admin", "operator", "technician", "viewer"];

const ROLE_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  admin:      { label: "Yönetici",  color: "#d97706", bg: "#fef9ec", dot: "#f59e0b" },
  operator:   { label: "Operatör",  color: "#2563eb", bg: "#eff6ff", dot: "#3b82f6" },
  technician: { label: "Teknisyen", color: "#7c3aed", bg: "#f5f3ff", dot: "#8b5cf6" },
  viewer:     { label: "İzleyici",  color: "#4b5563", bg: "#f3f4f6", dot: "#9ca3af" },
};

/**
 * API'den "Admin", "ADMIN", "admin" gibi farklı biçimlerde gelebilir.
 * Tüm karşılaştırmalar lowercase üzerinden yapılmalı.
 */
function normalizeRole(role: string | null | undefined): string {
  return (role ?? "viewer").trim().toLowerCase();
}

function getRoleMeta(role: string | null | undefined) {
  const key = normalizeRole(role);
  return ROLE_META[key] ?? ROLE_META["viewer"];
}

// ── Diğer yardımcılar ─────────────────────────────────────────────────────────

const locationOptions = [
  { id: "hq",    label: "Genel Merkez" },
  { id: "coop1", label: "Kümes 1" },
  { id: "coop2", label: "Kümes 2" },
  { id: "coop3", label: "Kümes 3" },
];

function getLocationLabel(id: string | null) {
  return locationOptions.find((l) => l.id === id)?.label ?? id ?? "—";
}

/** Ad + soyadın baş harfleri (en fazla 2 karakter). */
function getInitials(firstName: string, lastName: string | null): string {
  const a = firstName.trim().charAt(0).toUpperCase();
  const b = (lastName ?? "").trim().charAt(0).toUpperCase();
  return b ? `${a}${b}` : a;
}

// ── Avatar bileşeni ────────────────────────────────────────────────────────────

/**
 * Yuvarlak avatar.
 * showIcon=true olduğunda baş harfler yerine UserCircle2 ikonu gösterilir.
 */
function UserAvatar({
  firstName,
  lastName,
  role,
  size = 64,
  showIcon = false,
}: {
  firstName: string;
  lastName: string | null;
  role: string | null;
  size?: number;
  showIcon?: boolean;
}) {
  const rm = getRoleMeta(role);
  const initials = getInitials(firstName, lastName);
  const fontSize = Math.round(size * 0.36);
  const iconSize = Math.round(size * 0.52);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: rm.bg,
        border: `2.5px solid ${rm.dot}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontSize,
        fontWeight: 700,
        color: rm.color,
        letterSpacing: "0.5px",
        userSelect: "none",
        boxShadow: `0 0 0 4px ${rm.dot}22`,
      }}
    >
      {showIcon
        ? <UserCircle2 size={iconSize} color={rm.color} strokeWidth={1.6} />
        : initials}
    </div>
  );
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserAccount>>({});
  const [showAddForm, setShowAddForm] = useState(false);

  /**
   * BUG DÜZELTMESİ — localStorage/state çakışması:
   *
   * Eski kodda `role` state'i hem oturum açmış kullanıcının yetkisini
   * (localStorage "mockRole") hem de render sırasında döngüdeki `user.role`
   * ile karışabiliyordu. Ayrı isim kullanarak ikisi net biçimde ayrıldı:
   *   - `sessionRole` → oturum açmış kullanıcının yetkisi (localStorage)
   *   - users dizisindeki her `user.role` → ilgili çalışanın yetkisi
   */
  const [sessionRole, setSessionRole] = useState<string>("viewer");

  const [filterLocation, setFilterLocation] = useState<string>("");
  const [serverError, setServerError] = useState(false);
  const [newlyCreatedUser, setNewlyCreatedUser] = useState<{ userId: string; password: string } | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchTerm, setSearchTerm] = useState("");
  const [addForm, setAddForm] = useState({
    firstName: "", lastName: "", email: "",
    phoneNumber: "", role: "viewer", location: "hq",
  });

  useEffect(() => {
    // normalizeRole ile localStorage'daki değer de güvenli hale geliyor
    const stored = normalizeRole(localStorage.getItem("mockRole"));
    setSessionRole(stored);
  }, []);

  async function fetchUsers(loc: string) {
    setServerError(false);
    try {
      const url = loc
        ? `https://localhost:7069/api/user?location=${encodeURIComponent(loc)}`
        : "https://localhost:7069/api/user";
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: UserAccount[] = await res.json();
      // API'den gelen her kullanıcının role'ünü normalize ederek saklıyoruz
      setUsers(data.map((u) => ({ ...u, role: normalizeRole(u.role) })));
    } catch {
      setServerError(true);
    }
  }

  useEffect(() => { fetchUsers(filterLocation); }, [filterLocation]);

  function startEdit(user: UserAccount) {
    setEditingUserId(user.userId);
    // role zaten normalize edilmiş olarak users dizisinde tutuluyor
    setEditForm({ ...user });
  }

  async function saveEdit(userId: string) {
    try {
      await fetch(`https://localhost:7069/api/user/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setEditingUserId(null);
      fetchUsers(filterLocation);
    } catch { console.error("Güncelleme başarısız"); }
  }

  async function handleAddUser() {
    if (!addForm.firstName || !addForm.email) { alert("Ad ve email zorunlu."); return; }
    try {
      const res = await fetch("https://localhost:7069/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNewlyCreatedUser({ userId: data.userId, password: data.initialPassword });
      setShowAddForm(false);
      setAddForm({ firstName: "", lastName: "", email: "", phoneNumber: "", role: "viewer", location: "hq" });
      fetchUsers(filterLocation);
    } catch { alert("Ekleme başarısız."); }
  }

  const isAdmin = sessionRole === "admin";

  // Arama filtresi — ad, soyad, userId, email ve konum içinde arar
  const filteredUsers = users.filter((u) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      (u.lastName ?? "").toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      getLocationLabel(u.location).toLowerCase().includes(q) ||
      getRoleMeta(u.role).label.toLowerCase().includes(q)
    );
  });

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <style>{`
        .user-card {
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .user-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 30px -10px rgba(0,0,0,0.13);
        }
        .view-toggle-btn {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          border: 1px solid #e5e7eb; background: white;
          cursor: pointer; transition: all 0.12s;
        }
        .view-toggle-btn.active {
          background: #2563eb; border-color: #2563eb;
        }
      `}</style>

      {/* ── Başlık ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={20} /> Çalışanlar
          </h1>
          <p style={{ color: "#6b7280", fontSize: 14, margin: "4px 0 0" }}>
            Sistemdeki tüm çalışanlar ve rolleri
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Görünüm toggle */}
          <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 10, padding: 3 }}>
            <button
              className={`view-toggle-btn${viewMode === "card" ? " active" : ""}`}
              onClick={() => setViewMode("card")}
              title="Kart görünümü"
            >
              <LayoutGrid size={16} color={viewMode === "card" ? "white" : "#6b7280"} />
            </button>
            <button
              className={`view-toggle-btn${viewMode === "list" ? " active" : ""}`}
              onClick={() => setViewMode("list")}
              title="Liste görünümü"
            >
              <List size={16} color={viewMode === "list" ? "white" : "#6b7280"} />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#2563eb", color: "white", padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
            >
              <Plus size={16} /> Yeni Çalışan
            </button>
          )}
        </div>
      </div>

      {/* ── Arama kutusu ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "white", border: "1px solid #e5e7eb",
        borderRadius: 10, padding: "9px 14px",
        marginBottom: 12, maxWidth: 360,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
        onFocusCapture={(e) => { e.currentTarget.style.borderColor = "#2563eb"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)"; }}
        onBlurCapture={(e)  => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; }}
      >
        <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Ad, soyad, ID, email veya rol ara…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 13, color: "#374151", background: "transparent", width: "100%" }}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
          >
            <X size={14} color="#9ca3af" />
          </button>
        )}
      </div>

      {/* ── Konum filtresi ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[{ id: "", label: "Tüm Konumlar" }, ...locationOptions].map((loc) => (
          <button
            key={loc.id}
            onClick={() => setFilterLocation(loc.id)}
            style={{
              padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${filterLocation === loc.id ? "#2563eb" : "#e5e7eb"}`,
              background: filterLocation === loc.id ? "#eff6ff" : "white",
              color: filterLocation === loc.id ? "#2563eb" : "#6b7280",
              fontSize: 13, fontWeight: filterLocation === loc.id ? 600 : 400,
              cursor: "pointer", transition: "all 0.12s",
            }}
          >
            {loc.label}
          </button>
        ))}
      </div>

      {/* ── Hata ── */}
      {serverError && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#b91c1c", fontSize: 13 }}>
          Sunucuya bağlanılamadı.
        </div>
      )}

      {/* ── Yeni kullanıcı bilgisi ── */}
      {newlyCreatedUser && (
        <div style={{ background: "#f0f7f2", border: "1px solid #bbf7d0", borderRadius: 12, padding: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "#166534" }}>Yeni çalışan oluşturuldu</p>
            <p style={{ fontSize: 13, margin: "4px 0 0", color: "#166534" }}>
              Kullanıcı ID: <strong>{newlyCreatedUser.userId}</strong> · İlk Şifre: <strong>{newlyCreatedUser.password}</strong>
            </p>
            <p style={{ fontSize: 11, margin: "4px 0 0", color: "#4b7c5c" }}>Bu bilgileri çalışana iletin.</p>
          </div>
          <button onClick={() => setNewlyCreatedUser(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Yeni çalışan formu ── */}
      {isAdmin && showAddForm && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", padding: 20, marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: "#111827" }}>Yeni Çalışan Ekle</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 14 }}>
            <input placeholder="Ad *"    value={addForm.firstName}   onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}   style={inputStyle} />
            <input placeholder="Soyad"   value={addForm.lastName}    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}    style={inputStyle} />
            <input placeholder="Email *" value={addForm.email}       onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}       style={inputStyle} />
            <input placeholder="Telefon" value={addForm.phoneNumber} onChange={(e) => setAddForm({ ...addForm, phoneNumber: e.target.value })} style={inputStyle} />
            <select value={addForm.role}     onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}     style={inputStyle}>
              {roleOptions.map((r) => <option key={r} value={r}>{getRoleMeta(r).label}</option>)}
            </select>
            <select value={addForm.location} onChange={(e) => setAddForm({ ...addForm, location: e.target.value })} style={inputStyle}>
              {locationOptions.map((loc) => <option key={loc.id} value={loc.id}>{loc.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAddUser}          style={saveButtonStyle}>Kaydet</button>
            <button onClick={() => setShowAddForm(false)} style={cancelButtonStyle}>Vazgeç</button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          KART GÖRÜNÜMÜ
      ════════════════════════════════ */}
      {viewMode === "card" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {filteredUsers.map((user) => {
            const rm = getRoleMeta(user.role);
            const isEditing = editingUserId === user.userId;

            return (
              <div
                key={user.userId}
                className="user-card"
                style={{
                  background: "white",
                  borderRadius: 16,
                  border: "1px solid #eef0f2",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  overflow: "hidden",
                }}
              >
                {/* ── Kart üst bant (rol rengi) + avatar ── */}
                <div
                  style={{
                    height: 80,
                    background: `linear-gradient(135deg, ${rm.bg} 0%, ${rm.dot}30 100%)`,
                    borderBottom: `1px solid ${rm.dot}28`,
                    position: "relative",
                  }}
                >
                  {/* Rol badge — sağ üst */}
                  <span style={{
                    position: "absolute", top: 10, right: 12,
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 10, fontWeight: 700,
                    padding: "3px 9px", borderRadius: 20,
                    background: "white",
                    color: rm.color,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    border: `1px solid ${rm.dot}44`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: rm.dot }} />
                    {rm.label}
                  </span>

                  {/* Avatar — üst bantın altına taşıyor */}
                  <div style={{
                    position: "absolute",
                    bottom: -28,
                    left: "50%",
                    transform: "translateX(-50%)",
                  }}>
                    <UserAvatar
                      firstName={user.firstName}
                      lastName={user.lastName}
                      role={user.role}
                      size={56}
                      showIcon
                    />
                  </div>
                </div>

                {/* ── Kart alt içerik ── */}
                <div style={{ padding: "36px 18px 18px" }}>
                  {isEditing ? (
                    /* ── Düzenleme formu ── */
                    <div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <input value={editForm.firstName ?? ""}    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}    placeholder="Ad"    style={{ ...inputStyleSm, flex: 1 }} />
                        <input value={editForm.lastName ?? ""}     onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}     placeholder="Soyad" style={{ ...inputStyleSm, flex: 1 }} />
                      </div>
                      <input value={editForm.email ?? ""}          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}          placeholder="Email"   style={{ ...inputStyleSm, width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
                      <input value={editForm.phoneNumber ?? ""}    onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}    placeholder="Telefon" style={{ ...inputStyleSm, width: "100%", marginBottom: 6, boxSizing: "border-box" }} />
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <select
                          value={normalizeRole(editForm.role)}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          style={{ ...inputStyleSm, flex: 1 }}
                        >
                          {roleOptions.map((r) => <option key={r} value={r}>{getRoleMeta(r).label}</option>)}
                        </select>
                        <select
                          value={editForm.location ?? "hq"}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          style={{ ...inputStyleSm, flex: 1 }}
                        >
                          {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => saveEdit(user.userId)} style={{ ...saveButtonStyle, flex: 1, padding: "7px", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          <Check size={14} /> Kaydet
                        </button>
                        <button onClick={() => setEditingUserId(null)} style={{ ...cancelButtonStyle, flex: 1, padding: "7px", fontSize: 12 }}>
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Görüntüleme ── */
                    <>
                      <p style={{ fontSize: 15, fontWeight: 700, margin: "0 0 2px", color: "#111827", textAlign: "center" }}>
                        {user.firstName} {user.lastName}
                      </p>
                      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 14px", fontFamily: "monospace", textAlign: "center" }}>
                        {user.userId}
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4b5563" }}>
                          <div style={iconBoxStyle}><Mail size={12} color="#9ca3af" /></div>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</span>
                        </div>
                        {user.phoneNumber && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4b5563" }}>
                            <div style={iconBoxStyle}><Phone size={12} color="#9ca3af" /></div>
                            {user.phoneNumber}
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4b5563" }}>
                          <div style={iconBoxStyle}><MapPin size={12} color="#9ca3af" /></div>
                          {getLocationLabel(user.location)}
                        </div>
                      </div>

                      {isAdmin && (
                        <button
                          onClick={() => startEdit(user)}
                          style={{
                            width: "100%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            gap: 6, padding: "8px", borderRadius: 9,
                            border: `1.5px solid ${rm.dot}55`,
                            background: rm.bg,
                            color: rm.color, fontSize: 12, fontWeight: 600,
                            cursor: "pointer", transition: "opacity 0.14s",
                            boxSizing: "border-box",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.75"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                        >
                          <Pencil size={13} /> Düzenle
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && !serverError && (
            <p style={{ gridColumn: "1 / -1", textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 13 }}>
              {searchTerm
                ? `"${searchTerm}" ile eşleşen çalışan bulunamadı.`
                : filterLocation
                ? "Bu konumda çalışan bulunamadı."
                : "Henüz çalışan yok."}
            </p>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          LİSTE GÖRÜNÜMÜ
      ════════════════════════════════ */}
      {viewMode === "list" && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #eef0f2" }}>
                <th style={thStyle}>Çalışan</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Telefon</th>
                <th style={thStyle}>Rol</th>
                <th style={thStyle}>Konum</th>
                {isAdmin && <th style={thStyle} />}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const rm = getRoleMeta(user.role);
                const isEditing = editingUserId === user.userId;

                return (
                  <tr key={user.userId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    {isEditing ? (
                      <>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", gap: 4 }}>
                            <input value={editForm.firstName ?? ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} style={inputStyleSm} />
                            <input value={editForm.lastName  ?? ""} onChange={(e) => setEditForm({ ...editForm, lastName:  e.target.value })} style={inputStyleSm} />
                          </div>
                        </td>
                        <td style={tdStyle}><input value={editForm.email        ?? ""} onChange={(e) => setEditForm({ ...editForm, email:        e.target.value })} style={inputStyleSm} /></td>
                        <td style={tdStyle}><input value={editForm.phoneNumber  ?? ""} onChange={(e) => setEditForm({ ...editForm, phoneNumber:  e.target.value })} style={inputStyleSm} /></td>
                        <td style={tdStyle}>
                          <select
                            value={normalizeRole(editForm.role)}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                            style={inputStyleSm}
                          >
                            {roleOptions.map((r) => <option key={r} value={r}>{getRoleMeta(r).label}</option>)}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <select value={editForm.location ?? "hq"} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} style={inputStyleSm}>
                            {locationOptions.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                          </select>
                        </td>
                        <td style={tdStyle}>
                          <button onClick={() => saveEdit(user.userId)} style={iconBtnStyle}><Check size={15} color="#15803d" /></button>
                          <button onClick={() => setEditingUserId(null)} style={iconBtnStyle}><X size={15} color="#6b7280" /></button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <UserAvatar firstName={user.firstName} lastName={user.lastName} role={user.role} size={36} />
                            <div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#111827" }}>{user.firstName} {user.lastName}</p>
                              <p style={{ margin: 0, fontSize: 11, color: "#9ca3af", fontFamily: "monospace" }}>{user.userId}</p>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4b5563" }}>
                            <Mail size={12} color="#d1d5db" /> {user.email}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4b5563" }}>
                            {user.phoneNumber
                              ? <><Phone size={12} color="#d1d5db" /> {user.phoneNumber}</>
                              : <span style={{ color: "#d1d5db" }}>—</span>}
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: 11, fontWeight: 600,
                            padding: "3px 10px", borderRadius: 20,
                            background: rm.bg, color: rm.color,
                          }}>
                            <Shield size={10} color={rm.dot} />
                            {rm.label}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#4b5563" }}>
                            <MapPin size={12} color="#d1d5db" /> {getLocationLabel(user.location)}
                          </div>
                        </td>
                        {isAdmin && (
                          <td style={tdStyle}>
                            <button onClick={() => startEdit(user)} style={iconBtnStyle}>
                              <Pencil size={14} color="#6b7280" />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredUsers.length === 0 && !serverError && (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 13 }}>
              {searchTerm
                ? `"${searchTerm}" ile eşleşen çalışan bulunamadı.`
                : filterLocation
                ? "Bu konumda çalışan bulunamadı."
                : "Henüz çalışan yok."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Style sabitleri ───────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  textAlign: "left", padding: "10px 16px",
  fontSize: 12, color: "#6b7280", fontWeight: 600,
};
const tdStyle: React.CSSProperties = { padding: "10px 16px", fontSize: 13 };
const inputStyle: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, outline: "none",
  width: "100%", boxSizing: "border-box",
};
const inputStyleSm: React.CSSProperties = {
  ...inputStyle, padding: "6px 8px", fontSize: 12,
};
const saveButtonStyle: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 8, border: "none",
  background: "#2563eb", color: "white",
  fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const cancelButtonStyle: React.CSSProperties = {
  padding: "9px 16px", borderRadius: 8,
  border: "1px solid #e5e7eb", background: "white",
  color: "#6b7280", fontSize: 13, cursor: "pointer",
};
const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "none",
  cursor: "pointer", padding: 4, marginRight: 2,
};
const iconBoxStyle: React.CSSProperties = {
  width: 24, height: 24, borderRadius: 7,
  background: "#f3f4f6",
  display: "flex", alignItems: "center", justifyContent: "center",
  flexShrink: 0,
};
