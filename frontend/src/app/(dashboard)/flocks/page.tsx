"use client";

import { useEffect, useRef, useState } from "react";
import { Bird, X, Plus, Skull, LogOut, AlertCircle, Home, CheckCircle2, TrendingDown, RefreshCw, ArrowUpDown } from "lucide-react";

// ── Madde 7: API_BASE sabit yerine env var ────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://localhost:7069/api";

// ── Tipler ────────────────────────────────────────────────────────────────────

interface Coop {
  coopId: string;
  coopName: string;
  location?: string;
  capacity: number;
  currentCount: number;
  status: string;
}

interface Flock {
  flockId: number;
  coopId: string;
  breed: string;
  startDate: string;
  endDate: string | null;
  initialCount: number;
  currentCount: number;
}

type ModalMode = "start" | "loss" | "end" | null;
type SortKey = "coopName" | "lossRate" | "daysSince" | null;
type SortDir = "asc" | "desc";

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

/**
 * Madde 9: Tarihleri local timezone'da gün başlangıcına normalize ederek
 * UTC dönüşümünden kaynaklanan ±1 günlük sapmayı ortadan kaldırır.
 */
function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  // Local timezone'da gün başlangıcına çek (saat/dakika/saniye = 0)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24));
  return diff < 0 ? 0 : diff;
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.clone().json();
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    return await res.text();
  }
}

// ── Sayfa ─────────────────────────────────────────────────────────────────────

export default function FlocksPage() {
  const [coops, setCoops] = useState<Coop[]>([]);
  const [flocks, setFlocks] = useState<Flock[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  // Madde 8: arama + sıralama state'leri
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeCoop, setActiveCoop] = useState<Coop | null>(null);
  const [activeFlock, setActiveFlock] = useState<Flock | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Madde 6: ilk input'a auto-focus için ref
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [breed, setBreed] = useState("");
  const [initialCount, setInitialCount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [lossCount, setLossCount] = useState("");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => { loadData(); }, []);

  // Madde 6: Escape ile modal kapat + ilk input'a focus
  useEffect(() => {
    if (!modalMode) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    document.addEventListener("keydown", handleKeyDown);

    // Modal açıldığında ilk input'a focus
    const timer = setTimeout(() => firstInputRef.current?.focus(), 50);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [modalMode]);

  async function loadData() {
    setLoading(true);
    setPageError("");
    try {
      const [coopsRes, flocksRes] = await Promise.all([
        fetch(`${API_BASE}/Coop`),
        fetch(`${API_BASE}/Flock`),
      ]);
      if (!coopsRes.ok || !flocksRes.ok) throw new Error("Sunucudan veri alınamadı.");
      setCoops(await coopsRes.json());
      setFlocks(await flocksRes.json());
    } catch (err) {
      console.error(err);
      setPageError("Sunucuya bağlanılamadı, backend'in çalıştığından emin olun.");
    } finally {
      setLoading(false);
    }
  }

  function getActiveFlock(coopId: string): Flock | undefined {
    return flocks.find((f) => f.coopId === coopId && f.endDate === null);
  }

  function openStartModal(coop: Coop) {
    setActiveCoop(coop);
    setActiveFlock(null);
    setBreed("");
    setInitialCount("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setFormError("");
    setModalMode("start");
  }

  function openLossModal(coop: Coop, flock: Flock) {
    setActiveCoop(coop);
    setActiveFlock(flock);
    setLossCount("");
    setFormError("");
    setModalMode("loss");
  }

  function openEndModal(coop: Coop, flock: Flock) {
    setActiveCoop(coop);
    setActiveFlock(flock);
    setEndDate(new Date().toISOString().slice(0, 10));
    setFormError("");
    setModalMode("end");
  }

  function closeModal() {
    setModalMode(null);
    setActiveCoop(null);
    setActiveFlock(null);
    setFormError("");
  }

  // Madde 8: sıralama toggle
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleStartFlock() {
    if (!activeCoop) return;
    if (!breed.trim()) return setFormError("Irk bilgisi gerekli.");
    const count = parseInt(initialCount, 10);
    if (!count || count <= 0) return setFormError("Başlangıç sayısı 0'dan büyük olmalı.");

    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`${API_BASE}/Flock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coopId: activeCoop.coopId,
          breed: breed.trim(),
          startDate: new Date(startDate).toISOString(),
          initialCount: count,
        }),
      });
      if (!res.ok) return setFormError(await readErrorMessage(res));
      closeModal();
      await loadData();
    } catch {
      setFormError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRecordLoss() {
    if (!activeFlock) return;
    const count = parseInt(lossCount, 10);
    if (!count || count <= 0) return setFormError("Kayıp sayısı 0'dan büyük olmalı.");

    // Madde 5: frontend'de kayıp > mevcutsa istek atmadan hata göster
    if (count > activeFlock.currentCount) {
      return setFormError(
        `Kayıp sayısı (${count}) mevcut sayıdan (${activeFlock.currentCount}) fazla olamaz.`
      );
    }

    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`${API_BASE}/Flock/${activeFlock.flockId}/loss`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lossCount: count }),
      });
      if (!res.ok) return setFormError(await readErrorMessage(res));
      closeModal();
      await loadData();
    } catch {
      setFormError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEndFlock() {
    if (!activeFlock) return;
    setSubmitting(true);
    setFormError("");
    try {
      const res = await fetch(`${API_BASE}/Flock/${activeFlock.flockId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date(endDate).toISOString() }),
      });
      if (!res.ok) return setFormError(await readErrorMessage(res));
      closeModal();
      await loadData();
    } catch {
      setFormError("Sunucuya bağlanılamadı.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Özet istatistikler ──────────────────────────────────────────────────────

  const activeFlocks = coops
    .map((c) => getActiveFlock(c.coopId))
    .filter((f): f is Flock => !!f);
  const totalBirds   = activeFlocks.reduce((sum, f) => sum + f.currentCount, 0);
  const totalLoss    = activeFlocks.reduce((sum, f) => sum + (f.initialCount - f.currentCount), 0);
  const totalInitial = activeFlocks.reduce((sum, f) => sum + f.initialCount, 0);
  const lossRate     = totalInitial > 0 ? ((totalLoss / totalInitial) * 100).toFixed(1) : "0.0";

  // Madde 8: arama + sıralama uygula
  const displayedCoops = coops
    .filter((c) =>
      !searchTerm.trim() ||
      c.coopName.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const fa = getActiveFlock(a.coopId);
      const fb = getActiveFlock(b.coopId);

      let valA: number;
      let valB: number;

      if (sortKey === "coopName") {
        const cmp = a.coopName.localeCompare(b.coopName, "tr");
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "lossRate") {
        valA = fa && fa.initialCount > 0 ? (fa.initialCount - fa.currentCount) / fa.initialCount : -1;
        valB = fb && fb.initialCount > 0 ? (fb.initialCount - fb.currentCount) / fb.initialCount : -1;
      } else {
        // daysSince
        valA = fa ? daysSince(fa.startDate) : -1;
        valB = fb ? daysSince(fb.startDate) : -1;
      }

      return sortDir === "asc" ? valA - valB : valB - valA;
    });

  // Madde 6: focus trap yardımcısı
  function handleModalKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "32px 40px", background: "#f8fafc", minHeight: "100vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>Sürüler</h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
          Kümes başına sürü durumu, kayıp takibi ve sürü yönetimi.
        </p>
      </div>

      {/* Özet kartlar */}
      {!loading && !pageError && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
          <SummaryCard label="Toplam Kümes"  value={coops.length.toString()}              icon={<Home size={16} />} />
          <SummaryCard label="Aktif Sürü"    value={`${activeFlocks.length} / ${coops.length}`} icon={<CheckCircle2 size={16} />} />
          <SummaryCard label="Toplam Tavuk"  value={totalBirds.toLocaleString("tr-TR")}   icon={<Bird size={16} />} />
          <SummaryCard label="Kayıp Oranı"   value={`%${lossRate}`}                       icon={<TrendingDown size={16} />} warn={parseFloat(lossRate) > 5} />
        </div>
      )}

      {loading && <p style={{ color: "#64748b" }}>Yükleniyor...</p>}

      {/* Madde 10: pageError + "Tekrar Dene" butonu */}
      {pageError && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#fef2f2", color: "#b91c1c", padding: "12px 16px", borderRadius: 10, marginBottom: 20, fontSize: 14 }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span style={{ flex: 1 }}>{pageError}</span>
          <button
            onClick={loadData}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 7, border: "1px solid #fecaca", background: "white", color: "#b91c1c", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
          >
            <RefreshCw size={13} />
            Tekrar Dene
          </button>
        </div>
      )}

      {!loading && !pageError && (
        <>
          {/* Madde 8: arama kutusu */}
          <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="Kümes adına göre ara…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: 9, border: "1px solid #e2e8f0", fontSize: 13, outline: "none", width: 260 }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm("")} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center" }}>
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ background: "white", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  {/* Madde 8: sıralanabilir başlıklar */}
                  <SortableTh label="Kümes"            sortKey="coopName"   current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th style={thStyle}>Durum</th>
                  <th style={thStyle}>Irk</th>
                  <SortableTh label="Gün"              sortKey="daysSince"  current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th style={thStyle}>Mevcut / Başlangıç</th>
                  <SortableTh label="Kayıp"            sortKey="lossRate"   current={sortKey} dir={sortDir} onSort={handleSort} />
                  <th style={thStyle}></th>
                </tr>
              </thead>
              <tbody>
                {displayedCoops.map((coop) => {
                  const flock   = getActiveFlock(coop.coopId);
                  const loss    = flock ? flock.initialCount - flock.currentCount : 0;
                  const lossPct = flock && flock.initialCount > 0 ? (loss / flock.initialCount) * 100 : 0;

                  return (
                    <tr key={coop.coopId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 14 }}>{coop.coopName}</div>
                        {coop.location && <div style={{ fontSize: 12, color: "#94a3b8" }}>{coop.location}</div>}
                      </td>
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 999, background: flock ? "#dcfce7" : "#f1f5f9", color: flock ? "#15803d" : "#64748b" }}>
                          {flock ? "Aktif" : "Boş"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: flock ? "#0f172a" : "#cbd5e1" }}>
                        {flock ? flock.breed : "—"}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: flock ? "#0f172a" : "#cbd5e1" }}>
                        {flock ? `${daysSince(flock.startDate)} gün` : "—"}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: flock ? "#0f172a" : "#cbd5e1" }}>
                        {flock ? `${flock.currentCount.toLocaleString("tr-TR")} / ${flock.initialCount.toLocaleString("tr-TR")}` : "—"}
                      </td>
                      <td style={{ padding: "14px 20px", minWidth: 120 }}>
                        {flock ? (
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: lossPct > 5 ? "#dc2626" : "#0f172a" }}>
                              {loss} (%{lossPct.toFixed(1)})
                            </div>
                            <div style={{ height: 4, background: "#f1f5f9", borderRadius: 999, marginTop: 4 }}>
                              <div style={{ height: "100%", width: `${Math.min(lossPct * 4, 100)}%`, background: lossPct > 5 ? "#dc2626" : "#94a3b8", borderRadius: 999 }} />
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#cbd5e1" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        {flock ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                            <IconButton title="Kayıp Gir"       icon={<Skull size={15} />} onClick={() => openLossModal(coop, flock)} />
                            <IconButton title="Sürüyü Sonlandır" icon={<LogOut size={15} />}     onClick={() => openEndModal(coop, flock)} danger />
                          </div>
                        ) : (
                          <button
                            onClick={() => openStartModal(coop)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, background: "#2563eb", color: "white", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                          >
                            <Plus size={14} /> Sürü Başlat
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {displayedCoops.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                      {searchTerm ? `"${searchTerm}" ile eşleşen kümes bulunamadı.` : "Henüz kayıtlı kümes yok."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Modal ─────────────────────────────────────────────────────────────── */}
      {modalMode && activeCoop && (
        <div
          onClick={closeModal}
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
        >
          {/* Madde 6: role="dialog", aria-modal, focus trap */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleModalKeyDown}
            style={{ background: "white", borderRadius: 16, padding: 24, width: 380, maxWidth: "90vw", boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h3 id="modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
                {modalMode === "start" && "Yeni Sürü Başlat"}
                {modalMode === "loss"  && "Kayıp Gir"}
                {modalMode === "end"   && "Sürüyü Sonlandır"}
              </h3>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748b" }}>{activeCoop.coopName}</p>

            {modalMode === "start" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Irk">
                  {/* Madde 6: ilk input'a ref → auto-focus */}
                  <input ref={firstInputRef} type="text" value={breed} onChange={(e) => setBreed(e.target.value)} placeholder="örn: Ross 308" style={inputStyle} />
                </Field>
                <Field label="Başlangıç Sayısı">
                  <input type="number" value={initialCount} onChange={(e) => setInitialCount(e.target.value)} placeholder="örn: 5000" style={inputStyle} min={1} />
                </Field>
                <Field label="Başlangıç Tarihi">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            )}

            {modalMode === "loss" && activeFlock && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Mevcut sayı: <strong>{activeFlock.currentCount}</strong>
                </p>
                <Field label="Kayıp Sayısı">
                  <input ref={firstInputRef} type="number" value={lossCount} onChange={(e) => setLossCount(e.target.value)} placeholder="örn: 12" style={inputStyle} min={1} max={activeFlock.currentCount} />
                </Field>
              </div>
            )}

            {modalMode === "end" && activeFlock && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
                  Bu işlem sürüyü kapatır, kümes tekrar boş duruma geçer.
                </p>
                <Field label="Bitiş Tarihi">
                  <input ref={firstInputRef} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
                </Field>
              </div>
            )}

            {formError && (
              <p style={{ color: "#dc2626", fontSize: 13, marginTop: 12, marginBottom: 0, display: "flex", alignItems: "center", gap: 5 }}>
                <AlertCircle size={14} style={{ flexShrink: 0 }} />
                {formError}
              </p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button
                onClick={closeModal}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Vazgeç
              </button>
              <button
                disabled={submitting}
                onClick={modalMode === "start" ? handleStartFlock : modalMode === "loss" ? handleRecordLoss : handleEndFlock}
                style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: modalMode === "end" ? "#dc2626" : "#2563eb", color: "white", fontWeight: 600, fontSize: 14, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? "İşleniyor..." : "Onayla"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Alt bileşenler ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, icon, warn }: { label: string; value: string; icon: React.ReactNode; warn?: boolean }) {
  return (
    <div style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: warn ? "#fef2f2" : "#eff6ff", color: warn ? "#dc2626" : "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>{label}</p>
        <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 700, color: warn ? "#dc2626" : "#0f172a" }}>{value}</p>
      </div>
    </div>
  );
}

function IconButton({ title, icon, onClick, danger }: { title: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button title={title} onClick={onClick} style={{ width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: danger ? "#dc2626" : "#475569", cursor: "pointer" }}>
      {icon}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</span>
      {children}
    </label>
  );
}

/** Madde 8: sıralama ikonu ve tıklanabilir başlık */
function SortableTh({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      style={{ ...thStyle, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => onSort(sortKey)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {label}
        <ArrowUpDown
          size={12}
          style={{ opacity: active ? 1 : 0.35, transform: active && dir === "desc" ? "scaleY(-1)" : "none", transition: "opacity 0.15s" }}
        />
      </span>
    </th>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 20px",
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const inputStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};