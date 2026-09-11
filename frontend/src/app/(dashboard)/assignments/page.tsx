"use client";

import { useEffect, useState } from "react";
import {
  Droplets, Wheat, CheckCircle2, Clock, UserPlus, Send,
  ClipboardList, Check, Plus, X, ChevronDown, AlertCircle,
} from "lucide-react";

// ── Tipler ────────────────────────────────────────────────────────────────────

type TaskItem = {
  taskId: number;
  sensorId: string;
  coopId: string;
  taskType: string;
  status: string;
  createdAt: string;
  assignedUserId: string | null;
  completedAt: string | null;
  completedByUserId: string | null;
  addedAmount: number | null;
};

type AppUser = {
  userId: string;
  firstName: string;
  lastName: string;
  role: string;
};

// ── Yardımcı ─────────────────────────────────────────────────────────────────

const TASK_TYPE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  SuEkle:          { label: "Su Takviyesi",              color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd" },
  YemEkle:         { label: "Yem Takviyesi",             color: "#92400e", bg: "#fffbeb", border: "#fcd34d" },
  SicaklikKontrol: { label: "Sıcaklık Kontrolü",         color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  CO2Kontrol:      { label: "CO₂ / Amonyak Kontrolü",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  MotorKontrol:    { label: "Motor / Havalandırma",      color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
};

function getTaskMeta(type: string) {
  return TASK_TYPE_META[type] ?? { label: type, color: "#374151", bg: "#f9fafb", border: "#e5e7eb" };
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [role, setRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Görev oluşturma modal state
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    title: "",
    content: "",
    assigneeId: "",
    type: "Görev",
  });
  const [modalSending, setModalSending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Var olan görev atama state (inline)
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [messages, setMessages] = useState<Record<number, string>>({});

  useEffect(() => {
    setRole(localStorage.getItem("mockRole"));
    setCurrentUserId(localStorage.getItem("mockUserId"));
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const [taskRes, userRes] = await Promise.all([
          fetch("https://localhost:7069/api/task"),
          fetch("https://localhost:7069/api/User"),
        ]);
        setTasks(await taskRes.json());
        setUsers(await userRes.json());
      } catch (err) {
        console.error("Veri çekme hatası:", err);
      }
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const pendingTasks = tasks
    .filter((t) => t.status === "Bekliyor")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const completedTasks = tasks
    .filter((t) => t.status === "Tamamlandı")
    .sort((a, b) => new Date(b.completedAt ?? "").getTime() - new Date(a.completedAt ?? "").getTime());

  // ── Var olan görevi personele ata ─────────────────────────────────────────

  async function handleAssign(taskId: number) {
    const selectedUserId = selections[taskId];
    if (!selectedUserId) { alert("Lütfen personel seçin."); return; }
    try {
      const res = await fetch(`https://localhost:7069/api/task/${taskId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, message: messages[taskId] ?? "", senderUserId: currentUserId }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, assignedUserId: selectedUserId } : t));
      } else {
        alert("Atama sırasında hata oluştu.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleFill(taskId: number) {
    if (!currentUserId) return;
    if (!confirm("Bu görevi tamamlandı olarak işaretlemek istiyor musunuz?")) return;
    try {
      const res = await fetch(`https://localhost:7069/api/task/${taskId}/fill`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedByUserId: currentUserId, isAdmin: role === "admin" }),
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
      } else {
        alert(await res.text() || "İşlem tamamlanırken hata oluştu.");
      }
    } catch (err) {
      console.error(err);
    }
  }

  // ── Modal: yeni görev / bildirim gönder ──────────────────────────────────

  function openModal() {
    setModalForm({ title: "", content: "", assigneeId: "", type: "Görev" });
    setModalError(null);
    setShowModal(true);
  }

  async function handleModalSend() {
    if (!modalForm.title.trim()) { setModalError("Görev başlığı zorunlu."); return; }
    if (!modalForm.content.trim()) { setModalError("İçerik boş bırakılamaz."); return; }
    if (!modalForm.assigneeId) { setModalError("Lütfen bir personel seçin."); return; }

    setModalSending(true);
    setModalError(null);
    try {
      const res = await fetch("https://localhost:7069/api/Notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: modalForm.assigneeId,
          message: `[${modalForm.title}] ${modalForm.content}`,
          type: modalForm.type,
          senderUserId: currentUserId,
        }),
      });
      if (!res.ok) throw new Error("Sunucu hatası");
      setShowModal(false);
    } catch (err) {
      setModalError("Görev gönderilirken hata oluştu.");
    } finally {
      setModalSending(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Başlık */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
            {role === "admin" ? "Görevlendirme Yönetimi" : "Ekip İletişimi"}
          </h1>
          <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>
            {role === "admin"
              ? "Sistem alarmlarını yönetin, personele görev ve bildirim gönderin."
              : "Size atanan görevleri buradan görebilir ve tamamlayabilirsiniz."}
          </p>
        </div>
        <button
          onClick={openModal}
          style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 9,
            border: "none", background: "#2563eb", color: "white",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            boxShadow: "0 2px 8px rgba(37,99,235,0.25)",
            transition: "background 0.15s",
          }}
        >
          <Plus size={16} /> Yeni Görev Oluştur
        </button>
      </div>

      {/* Sekmeler */}
      {role === "admin" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid #e5e7eb", paddingBottom: 12 }}>
          {[
            { key: "pending" as const, icon: ClipboardList, label: `Bekleyen / Verilmiş (${pendingTasks.length})` },
            { key: "completed" as const, icon: CheckCircle2, label: `Tamamlanan (${completedTasks.length})` },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                border: "none",
                background: activeTab === key ? "#2563eb" : "#f3f4f6",
                color: activeTab === key ? "white" : "#4b5563",
                fontSize: 13, fontWeight: 500, cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── Bekleyen Görevler ── */}
      {(role === "admin" ? activeTab === "pending" : true) && (
        <div>
          {pendingTasks.length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", padding: "36px 0", textAlign: "center", marginBottom: 24 }}>
              <CheckCircle2 size={28} color="#3f7d58" style={{ marginBottom: 8 }} />
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>Atanacak bekleyen iş emri yok.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              {pendingTasks.map((task) => {
                const meta = getTaskMeta(task.taskType);
                const isAssigned = !!task.assignedUserId;
                const canFill = isAssigned && (role === "admin" || task.assignedUserId === currentUserId);
                const assigneeName = users.find((u) => u.userId === task.assignedUserId);

                return (
                  <div
                    key={task.taskId}
                    style={{
                      background: "white", borderRadius: 12,
                      border: `1.5px solid ${isAssigned ? "#eef0f2" : meta.border}`,
                      padding: "14px 18px",
                      display: "flex", alignItems: "center",
                      justifyContent: "space-between", gap: 12,
                    }}
                  >
                    {/* Sol: ikon + bilgi */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: isAssigned ? "#f3f4f6" : meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {task.taskType === "SuEkle" ? <Droplets size={16} color={isAssigned ? "#9ca3af" : meta.color} />
                          : task.taskType === "YemEkle" ? <Wheat size={16} color={isAssigned ? "#9ca3af" : meta.color} />
                          : <AlertCircle size={16} color={isAssigned ? "#9ca3af" : meta.color} />}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: "#111827" }}>{meta.label}</p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={10} />
                          {task.coopId} · {new Date(task.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>

                    {/* Sağ: atama arayüzü */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      {isAssigned ? (
                        <>
                          <span style={{ fontSize: 12, color: "#3f7d58", fontWeight: 500, background: "#ecfdf5", padding: "5px 10px", borderRadius: 6, whiteSpace: "nowrap" }}>
                            {assigneeName ? `${assigneeName.firstName} ${assigneeName.lastName}` : task.assignedUserId}
                          </span>
                          {canFill && (
                            <button
                              onClick={() => handleFill(task.taskId)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "none", background: "#16a34a", color: "white", fontSize: 12, fontWeight: 500, cursor: "pointer" }}
                            >
                              <Check size={14} /> Tamamla
                            </button>
                          )}
                        </>
                      ) : role === "admin" ? (
                        <>
                          <input
                            type="text"
                            placeholder="Not (opsiyonel)"
                            value={messages[task.taskId] ?? ""}
                            onChange={(e) => setMessages((p) => ({ ...p, [task.taskId]: e.target.value }))}
                            style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, outline: "none", width: 110 }}
                          />
                          <div style={{ position: "relative" }}>
                            <select
                              value={selections[task.taskId] ?? ""}
                              onChange={(e) => setSelections((p) => ({ ...p, [task.taskId]: e.target.value }))}
                              style={{ padding: "6px 28px 6px 10px", borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12, background: "white", outline: "none", appearance: "none", cursor: "pointer" }}
                            >
                              <option value="" disabled>Personel seç…</option>
                              {users.filter((u) => u.role !== "admin").map((u) => (
                                <option key={u.userId} value={u.userId}>{u.firstName} {u.lastName}</option>
                              ))}
                            </select>
                            <ChevronDown size={12} color="#9ca3af" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
                          </div>
                          <button
                            onClick={() => handleAssign(task.taskId)}
                            style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", borderRadius: 6, border: "none", background: "#2563eb", color: "white", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}
                          >
                            <UserPlus size={14} /> Görevlendir
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, color: "#9ca3af", fontStyle: "italic" }}>Atama bekleniyor</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Tamamlanan Görevler ── */}
      {role === "admin" && activeTab === "completed" && (
        <div>
          {completedTasks.length === 0 ? (
            <div style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", padding: "36px 0", textAlign: "center" }}>
              <p style={{ color: "#6b7280", fontSize: 13, margin: 0 }}>Henüz tamamlanan iş yok.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {completedTasks.map((task) => {
                const meta = getTaskMeta(task.taskType);
                const doer = users.find((u) => u.userId === task.completedByUserId);
                return (
                  <div key={task.taskId} style={{ background: "white", borderRadius: 12, border: "1px solid #eef0f2", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <CheckCircle2 size={18} color="#3f7d58" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, margin: 0, color: "#111827" }}>
                          {meta.label} <span style={{ color: "#9ca3af", fontWeight: 400 }}>· {task.coopId}</span>
                        </p>
                        <p style={{ fontSize: 11, color: "#9ca3af", margin: "2px 0 0" }}>
                          Oluşturuldu: {new Date(task.createdAt).toLocaleString("tr-TR")}
                        </p>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: "#4b5563", background: "#f9fafb", padding: "6px 12px", borderRadius: 6, border: "1px solid #e5e7eb", textAlign: "right" }}>
                      <div style={{ fontWeight: 600 }}>
                        {doer ? `${doer.firstName} ${doer.lastName}` : task.completedByUserId ?? "—"}
                      </div>
                      <div style={{ color: "#9ca3af", marginTop: 2 }}>
                        {task.completedAt ? new Date(task.completedAt).toLocaleString("tr-TR") : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          YENİ GÖREV OLUŞTUR MODALI
      ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, backdropFilter: "blur(3px)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } } @keyframes popIn { from { opacity: 0; transform: scale(0.94) translateY(12px) } to { opacity: 1; transform: scale(1) translateY(0) } }`}</style>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "white", borderRadius: 16,
              padding: 28, width: "100%", maxWidth: 480,
              boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
              animation: "popIn 0.22s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* Modal başlık */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Send size={18} color="#2563eb" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>Yeni Görev / Bildirim</h3>
                  <p style={{ margin: 0, fontSize: 12, color: "#9ca3af" }}>Personele görev veya mesaj gönder</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            {/* Tür seçimi */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Görev / Bildirim Türü</label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {[
                  { value: "Görev", label: "Saha Görevi" },
                  { value: "Toplantı", label: "Toplantı" },
                  { value: "Bilgi", label: "Duyuru" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setModalForm((p) => ({ ...p, type: opt.value }))}
                    style={{
                      flex: 1, padding: "7px 0", borderRadius: 8, fontSize: 12, fontWeight: 600,
                      cursor: "pointer", transition: "all 0.12s",
                      border: modalForm.type === opt.value ? "1.5px solid #2563eb" : "1.5px solid #e5e7eb",
                      background: modalForm.type === opt.value ? "#eff6ff" : "white",
                      color: modalForm.type === opt.value ? "#2563eb" : "#6b7280",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Görev başlığı */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Görev Başlığı <span style={{ color: "#dc2626" }}>*</span></label>
              <input
                placeholder="Örn: Su deposu doldurulacak"
                value={modalForm.title}
                onChange={(e) => setModalForm((p) => ({ ...p, title: e.target.value }))}
                style={modalInputStyle}
              />
            </div>

            {/* İçerik */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>İçerik / Talimat <span style={{ color: "#dc2626" }}>*</span></label>
              <textarea
                rows={3}
                placeholder="Göreve dair açıklama, yer bilgisi veya talimatlar…"
                value={modalForm.content}
                onChange={(e) => setModalForm((p) => ({ ...p, content: e.target.value }))}
                style={{ ...modalInputStyle, resize: "none" }}
              />
            </div>

            {/* Personel seçimi */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Personel Seç <span style={{ color: "#dc2626" }}>*</span></label>
              <div style={{ position: "relative", marginTop: 6 }}>
                <select
                  value={modalForm.assigneeId}
                  onChange={(e) => setModalForm((p) => ({ ...p, assigneeId: e.target.value }))}
                  style={{ ...modalInputStyle, paddingRight: 36, appearance: "none", cursor: "pointer" }}
                >
                  <option value="" disabled>Personel seçin…</option>
                  {users.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.firstName} {u.lastName} — {u.role === "admin" ? "Yönetici" : u.role === "operator" ? "Operatör" : u.role === "technician" ? "Teknisyen" : "İzleyici"}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} color="#9ca3af" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
              </div>
            </div>

            {/* Hata */}
            {modalError && (
              <div style={{ marginBottom: 14, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#b91c1c", display: "flex", alignItems: "center", gap: 6 }}>
                <AlertCircle size={14} /> {modalError}
              </div>
            )}

            {/* Butonlar */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: "9px 18px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", color: "#6b7280", fontSize: 13, cursor: "pointer", fontWeight: 500 }}
              >
                Vazgeç
              </button>
              <button
                onClick={handleModalSend}
                disabled={modalSending}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: modalSending ? "#93c5fd" : "#2563eb",
                  color: "white", fontSize: 13, fontWeight: 600,
                  cursor: modalSending ? "default" : "pointer",
                  transition: "background 0.15s",
                }}
              >
                <Send size={14} />
                {modalSending ? "Gönderiliyor…" : "Gönder"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Style sabitleri ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 600, color: "#374151",
};

const modalInputStyle: React.CSSProperties = {
  display: "block", width: "100%", marginTop: 6,
  padding: "9px 12px", borderRadius: 8,
  border: "1px solid #e5e7eb", fontSize: 13, outline: "none",
  boxSizing: "border-box", fontFamily: "inherit",
};
