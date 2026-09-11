"use client";

import { useEffect, useState, useRef } from "react";
import { RefreshCw, CheckCircle, Reply, Mail, MailOpen, Send } from "lucide-react";

type InboxMessage = {
  notificationId: number;
  userId: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  senderUserId: string | null;
  relatedTaskId: number | null;
  parentNotificationId: number | null;
  senderFirstName: string | null;
  senderLastName: string | null;
  senderRole: string | null;
};

type ThreadMessage = {
  notificationId: number;
  userId: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
  senderUserId: string | null;
  parentNotificationId: number | null;
  senderFirstName: string | null;
  senderLastName: string | null;
  senderRole: string | null;
  isMine: boolean;
};

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  Gorev:           { label: "Görev",      color: "#b45309", bg: "#fef3c7" },
  Bilgi:           { label: "Bilgi",       color: "#1d4ed8", bg: "#dbeafe" },
  Toplanti:        { label: "Toplantı",    color: "#6d28d9", bg: "#ede9fe" },
  Yanit:           { label: "Yanıt",       color: "#065f46", bg: "#d1fae5" },
  GorevTamamlandi: { label: "Tamamlandı",  color: "#166534", bg: "#dcfce7" },
};

function typeBadge(type: string) {
  const t = TYPE_LABELS[type] ?? { label: type, color: "#374151", bg: "#f3f4f6" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
      color: t.color, background: t.bg, whiteSpace: "nowrap" as const,
    }}>
      {t.label}
    </span>
  );
}

export default function MessagesPage() {
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [selected, setSelected] = useState<InboxMessage | null>(null);
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [taskDone, setTaskDone] = useState<Record<number, boolean>>({});
  const [serverError, setServerError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [currentUserId, setCurrentUserId] = useState("");

  useEffect(() => {
    setCurrentUserId(localStorage.getItem("mockUserId") ?? "");
  }, []);

  useEffect(() => {
    if (currentUserId) fetchInbox();
  }, [currentUserId]);

  // Thread güncellenince en alta kaydır
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread]);

  async function fetchInbox() {
    setLoading(true);
    setServerError(false);
    try {
      const res = await fetch(`https://localhost:7069/api/notification/inbox/${currentUserId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setInbox(await res.json());
    } catch (err) {
      console.error("Mesajlar alınamadı:", err);
      setServerError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchThread(msg: InboxMessage) {
    setThreadLoading(true);
    setThread([]);
    try {
      const res = await fetch(
        `https://localhost:7069/api/notification/thread/${msg.notificationId}?currentUserId=${encodeURIComponent(currentUserId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setThread(await res.json());
    } catch (err) {
      console.error("Thread alınamadı:", err);
    } finally {
      setThreadLoading(false);
    }
  }

  async function handleSelect(msg: InboxMessage) {
    setSelected(msg);
    setReplyText("");
    await fetchThread(msg);

    if (!msg.isRead) {
      try {
        await fetch(`https://localhost:7069/api/notification/${msg.notificationId}/read`, { method: "PUT" });
        setInbox((prev) => prev.map((m) =>
          m.notificationId === msg.notificationId ? { ...m, isRead: true } : m
        ));
      } catch (err) {
        console.error("Okundu işareti hata:", err);
      }
    }
  }

  async function handleTaskComplete() {
    if (!selected?.relatedTaskId) return;
    try {
      await fetch(`https://localhost:7069/api/task/${selected.relatedTaskId}/fill`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completedByUserId: currentUserId, isAdmin: false }),
      });

      if (selected.senderUserId) {
        await fetch("https://localhost:7069/api/notification", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selected.senderUserId,
            message: `${currentUserId} kullanıcısı görevi tamamladı. (Görev #${selected.relatedTaskId})`,
            type: "GorevTamamlandi",
            senderUserId: currentUserId,
            relatedTaskId: selected.relatedTaskId,
          }),
        });
      }

      setTaskDone((prev) => ({ ...prev, [selected.notificationId]: true }));
    } catch (err) {
      console.error("Görev tamamlanamadı:", err);
    }
  }

  async function handleReply() {
    if (!replyText.trim() || !selected) return;
    try {
      await fetch(`https://localhost:7069/api/notification/${selected.notificationId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      setReplyText("");
      // Thread'i yenile
      await fetchThread(selected);
    } catch (err) {
      console.error("Yanıt gönderilemedi:", err);
    }
  }

  const unreadCount = inbox.filter((m) => !m.isRead).length;
  // Kök mesaj (thread'deki ilk mesaj — ParentNotificationId null olan)
  const rootMsg = thread.find((m) => m.parentNotificationId == null) ?? thread[0];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 70px)", fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>

      {/* ── Sol panel: inbox listesi ── */}
      <div style={{ width: 340, minWidth: 340, borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column", background: "white" }}>
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Mesajlar</h1>
              {unreadCount > 0 && (
                <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 600 }}>{unreadCount} okunmamış</span>
              )}
            </div>
            <button
              onClick={fetchInbox}
              style={{ background: "#f1f5f9", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#475569", fontWeight: 500 }}
            >
              <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
              Yenile
            </button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1 }}>
          {serverError && (
            <div style={{ padding: 20, textAlign: "center", color: "#ef4444", fontSize: 13 }}>
              Sunucuya bağlanılamadı.
            </div>
          )}
          {!serverError && inbox.length === 0 && !loading && (
            <div style={{ padding: 40, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>Gelen kutunuz boş.</div>
          )}
          {inbox.map((msg) => {
            const isActive = selected?.notificationId === msg.notificationId;
            const senderName = msg.senderFirstName ? `${msg.senderFirstName} ${msg.senderLastName}` : "Sistem";
            return (
              <div
                key={msg.notificationId}
                onClick={() => handleSelect(msg)}
                style={{
                  padding: "14px 20px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                  background: isActive ? "#eff6ff" : msg.isRead ? "white" : "#f0f9ff",
                  borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {msg.isRead ? <MailOpen size={15} color="#94a3b8" /> : <Mail size={15} color="#2563eb" />}
                    <span style={{ fontSize: 14, fontWeight: msg.isRead ? 500 : 700, color: "#0f172a" }}>{senderName}</span>
                  </div>
                  {typeBadge(msg.type)}
                </div>
                {msg.senderRole && (
                  <p style={{ margin: "0 0 4px 23px", fontSize: 11, color: "#64748b" }}>{msg.senderRole}</p>
                )}
                <p style={{ margin: "0 0 0 23px", fontSize: 13, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {msg.message}
                </p>
                <p style={{ margin: "4px 0 0 23px", fontSize: 11, color: "#94a3b8" }}>
                  {new Date(msg.createdAt).toLocaleString("tr-TR")}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Sağ panel: thread (sohbet) görünümü ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8", gap: 12 }}>
            <Mail size={48} color="#cbd5e1" />
            <p style={{ margin: 0, fontSize: 15 }}>Bir mesaj seçin</p>
          </div>
        ) : (
          <>
            {/* Başlık şeridi */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e2e8f0", background: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  {typeBadge(selected.type)}
                  {selected.senderRole && <span style={{ fontSize: 12, color: "#64748b" }}>{selected.senderRole}</span>}
                </div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
                  {selected.senderFirstName ? `${selected.senderFirstName} ${selected.senderLastName}` : "Sistem"}
                </h2>
              </div>
              {/* Görevi tamamla — sadece kök mesaj Gorev tipindeyse */}
              {rootMsg && rootMsg.type === "Gorev" && selected.relatedTaskId && (
                <button
                  onClick={handleTaskComplete}
                  disabled={!!taskDone[selected.notificationId]}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 8, border: "none",
                    background: taskDone[selected.notificationId] ? "#dcfce7" : "#16a34a",
                    color: taskDone[selected.notificationId] ? "#166534" : "white",
                    fontWeight: 600, fontSize: 13,
                    cursor: taskDone[selected.notificationId] ? "default" : "pointer",
                  }}
                >
                  <CheckCircle size={15} />
                  {taskDone[selected.notificationId] ? "Tamamlandı" : "Görevi Tamamla"}
                </button>
              )}
            </div>

            {/* Mesaj balonları */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
              {threadLoading && (
                <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, paddingTop: 40 }}>Yükleniyor...</div>
              )}
              {thread.map((msg) => (
                <div
                  key={msg.notificationId}
                  style={{
                    display: "flex",
                    justifyContent: msg.isMine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      padding: "10px 14px",
                      borderRadius: msg.isMine ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
                      background: msg.isMine ? "#2563eb" : "white",
                      color: msg.isMine ? "white" : "#1e293b",
                      border: msg.isMine ? "none" : "1px solid #e2e8f0",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
                    }}
                  >
                    {/* Gönderen adı — benim değilse göster */}
                    {!msg.isMine && (
                      <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#475569" }}>
                        {msg.senderFirstName ? `${msg.senderFirstName} ${msg.senderLastName}` : "Sistem"}
                        {msg.senderRole && <span style={{ fontWeight: 400, marginLeft: 4 }}>· {msg.senderRole}</span>}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{msg.message}</p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, gap: 8 }}>
                      {typeBadge(msg.type)}
                      <span style={{ fontSize: 10, color: msg.isMine ? "rgba(255,255,255,0.7)" : "#94a3b8", whiteSpace: "nowrap" }}>
                        {new Date(msg.createdAt).toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Yanıt kutusu */}
            <div style={{ padding: "12px 24px", borderTop: "1px solid #e2e8f0", background: "white", display: "flex", gap: 10, alignItems: "flex-end" }}>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                rows={2}
                placeholder="Yanıtınızı yazın..."
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0",
                  fontSize: 14, resize: "none" as const, outline: "none",
                  fontFamily: "system-ui, sans-serif", lineHeight: 1.5,
                }}
              />
              <button
                onClick={handleReply}
                disabled={!replyText.trim()}
                style={{
                  padding: "10px 16px", borderRadius: 10, border: "none",
                  background: replyText.trim() ? "#2563eb" : "#e2e8f0",
                  color: replyText.trim() ? "white" : "#94a3b8",
                  cursor: replyText.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                <Send size={15} /> Gönder
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
