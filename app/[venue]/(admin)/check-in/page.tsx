"use client";
import { useState, useEffect, useRef } from "react";

// ── Types ──

interface CheckIn {
  id: string;
  memberId: string;
  internalMemberId: string;
  memberName: string;
  memberEmail: string;
  memberTier: "classic" | "enthusiast";
  guestCount: number;
  isNew: boolean;
  visitCount: number;
  notes: string | null;
  timestamp: string;
  checkoutTime: string | null;
}

interface Signup {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timestamp: string;
}

interface Renewal {
  memberId: string;
  memberName: string;
  timestamp: string;
}

interface SearchResult {
  squareId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface MemberDetail {
  squareId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tier: string;
  expiration: string | null;
}

// ── Helpers ──

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const TAB_STYLE: React.CSSProperties = {
  padding: "8px 20px",
  cursor: "pointer",
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#888",
  borderBottom: "2px solid transparent",
  transition: "all 0.2s",
};

const TAB_ACTIVE: React.CSSProperties = {
  ...TAB_STYLE,
  color: "#c5a572",
  borderBottom: "2px solid #c5a572",
};

const BADGE = (bg: string, fg: string): React.CSSProperties => ({
  fontSize: "0.6rem",
  padding: "2px 7px",
  borderRadius: "3px",
  background: bg,
  color: fg,
  marginLeft: "6px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
});

// ── Main ──

export default function CheckInPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "checkin" | "signup" | "history">("dashboard");

  return (
    <div>
      <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #444", paddingBottom: "0" }}>
        {(["dashboard", "checkin", "signup", "history"] as const).map((tab) => (
          <div key={tab} style={activeTab === tab ? TAB_ACTIVE : TAB_STYLE} onClick={() => setActiveTab(tab)}>
            {tab === "checkin" ? "Check In" : tab === "signup" ? "New Member" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </div>
        ))}
      </div>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "checkin" && <CheckInTab />}
      {activeTab === "signup" && <SignupTab />}
      {activeTab === "history" && <HistoryTab />}
    </div>
  );
}

/* ── Dashboard Tab ── */
function DashboardTab() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);
  const [notesEditing, setNotesEditing] = useState<string | null>(null);
  const [notesValue, setNotesValue] = useState("");

  async function fetchAll() {
    try {
      const [cRes, sRes, rRes] = await Promise.all([
        fetch("/api/checkins").catch(() => null),
        fetch("/api/signups").catch(() => null),
        fetch("/api/renewal-requests").catch(() => null),
      ]);

      if (cRes?.ok) { const data = await cRes.json(); setCheckins(data.checkins || []); }
      if (sRes?.ok) { const data = await sRes.json(); setSignups(data.signups || []); }
      if (rRes?.ok) { const data = await rRes.json(); setRenewals(data.requests || []); }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }

  useEffect(() => {
    fetchAll();
    // Auto-checkout stale check-ins from previous days on load
    fetch("/api/checkins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout-all" }),
    }).catch(() => {});
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  async function handleCheckout(id: string) {
    await fetch("/api/checkins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "checkout" }),
    });
    fetchAll();
  }

  async function handleSaveNotes(id: string) {
    await fetch("/api/checkins", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "notes", notes: notesValue }),
    });
    setNotesEditing(null);
    fetchAll();
  }

  const active = checkins.filter((c) => !c.checkoutTime);
  const checkedOut = checkins.filter((c) => c.checkoutTime);
  const totalGuests = checkins.reduce((sum, c) => sum + (c.guestCount || 0), 0);
  const newCount = checkins.filter((c) => c.isNew).length;
  const classicCount = active.filter((c) => c.memberTier === "classic").length;
  const enthusiastCount = active.filter((c) => c.memberTier === "enthusiast").length;

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: "30px", marginBottom: "30px", flexWrap: "wrap" }}>
        {[
          { val: active.length, label: "Checked In" },
          { val: totalGuests, label: "Guests" },
          { val: active.length + totalGuests, label: "Total In House" },
          { val: newCount, label: "New" },
          { val: classicCount, label: "Classic" },
          { val: enthusiastCount, label: "Enthusiast" },
        ].map((s) => (
          <div key={s.label}>
            <div style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#c5a572" }}>{s.val}</div>
            <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Check-ins */}
        <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444" }}>
            <span style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#888" }}>
              Checked In Tonight
            </span>
            {active.length > 0 && (
              <button
                onClick={async () => {
                  if (!confirm("Check out all current members?")) return;
                  for (const c of active) await handleCheckout(c.id);
                }}
                style={{ fontSize: "0.65rem", padding: "4px 10px", background: "#4a2a2a", color: "#d4a0a0", border: "none", borderRadius: "4px", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                Close Out Night
              </button>
            )}
          </div>
          {checkins.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No check-ins yet</div>
          ) : (
            <>
              {/* Active check-ins */}
              {active.map((c) => (
                <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #3a3a3a" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 500 }}>{c.memberName}</span>
                        <span style={BADGE(c.memberTier === "enthusiast" ? "#3a2a5a" : "#3a3a3a", c.memberTier === "enthusiast" ? "#c4a0d4" : "#bbb")}>
                          {c.memberTier === "enthusiast" ? "ENT" : "CLS"}
                        </span>
                        {c.isNew && <span style={BADGE("#4a6741", "#b5d4aa")}>NEW</span>}
                        {c.guestCount > 0 && <span style={BADGE("#5a4a2a", "#d4c4a0")}>+{c.guestCount}</span>}
                        {c.visitCount > 1 && (
                          <span style={{ fontSize: "0.6rem", marginLeft: "6px", color: "#888" }}>
                            {c.visitCount} visits
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>
                        {c.memberEmail || ""}
                      </div>
                      {/* Notes */}
                      {notesEditing === c.id ? (
                        <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
                          <input
                            autoFocus
                            value={notesValue}
                            onChange={(e) => setNotesValue(e.target.value)}
                            placeholder="add note..."
                            style={{ flex: 1, padding: "4px 8px", background: "#2a2a2a", border: "1px solid #555", borderRadius: "4px", color: "#eee", fontSize: "0.75rem", outline: "none" }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveNotes(c.id); if (e.key === "Escape") setNotesEditing(null); }}
                          />
                          <button onClick={() => handleSaveNotes(c.id)} style={{ padding: "4px 8px", background: "#c5a572", color: "#1a1a1a", border: "none", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>Save</button>
                          <button onClick={() => setNotesEditing(null)} style={{ padding: "4px 8px", background: "#444", color: "#aaa", border: "none", borderRadius: "4px", fontSize: "0.7rem", cursor: "pointer" }}>X</button>
                        </div>
                      ) : c.notes ? (
                        <div
                          onClick={() => { setNotesEditing(c.id); setNotesValue(c.notes || ""); }}
                          style={{ fontSize: "0.7rem", color: "#a0a0a0", fontStyle: "italic", marginTop: "4px", cursor: "pointer" }}
                        >
                          {c.notes}
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <span style={{ fontSize: "0.8rem", color: "#666" }}>{formatTime(c.timestamp)}</span>
                      <button
                        onClick={() => { setNotesEditing(c.id); setNotesValue(c.notes || ""); }}
                        title="Add note"
                        style={{ padding: "3px 6px", background: "transparent", color: "#666", border: "1px solid #555", borderRadius: "4px", fontSize: "0.65rem", cursor: "pointer" }}
                      >
                        Note
                      </button>
                      <button
                        onClick={() => handleCheckout(c.id)}
                        title="Check out"
                        style={{ padding: "3px 6px", background: "#4a2a2a", color: "#d4a0a0", border: "none", borderRadius: "4px", fontSize: "0.65rem", cursor: "pointer" }}
                      >
                        Out
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Checked-out section */}
              {checkedOut.length > 0 && (
                <>
                  <div style={{ textTransform: "uppercase", fontSize: "0.65rem", letterSpacing: "0.15em", color: "#666", marginTop: "20px", marginBottom: "10px" }}>
                    Checked Out ({checkedOut.length})
                  </div>
                  {checkedOut.map((c) => (
                    <div key={c.id} style={{ padding: "8px 0", borderBottom: "1px solid #333", opacity: 0.5 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span style={{ textDecoration: "line-through" }}>{c.memberName}</span>
                          <span style={BADGE(c.memberTier === "enthusiast" ? "#3a2a5a" : "#3a3a3a", c.memberTier === "enthusiast" ? "#c4a0d4" : "#bbb")}>
                            {c.memberTier === "enthusiast" ? "ENT" : "CLS"}
                          </span>
                          {c.notes && <span style={{ fontSize: "0.65rem", color: "#888", fontStyle: "italic", marginLeft: "8px" }}>{c.notes}</span>}
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#555" }}>
                          {formatTime(c.timestamp)} → {formatTime(c.checkoutTime!)}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Signups */}
          <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
            <div style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444" }}>New Signups Tonight</div>
            {signups.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No signups yet</div>
            ) : (
              signups.map((s, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #3a3a3a" }}>
                  <div>{s.firstName} {s.lastName}</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>{s.email || ""} · {formatTime(s.timestamp)}</div>
                </div>
              ))
            )}
          </div>

          {/* Renewals */}
          <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
            <div style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444" }}>Renewal Requests</div>
            {renewals.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No renewal requests</div>
            ) : (
              renewals.map((r, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #3a3a3a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div>{r.memberName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>{formatTime(r.timestamp)}</div>
                  </div>
                  <span style={BADGE("#2a4a5a", "#a0c4d4")}>WANTS TO RENEW</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.7rem", color: "#555", textAlign: "center", marginTop: "20px" }}>Auto-refreshes every 15 seconds</div>
    </div>
  );
}

/* ── Check In Tab ── */
function CheckInTab() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<MemberDetail | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [checkinNotes, setCheckinNotes] = useState("");
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  function doSearch(q: string) {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.members || []);
      } catch { setResults([]); }
      setSearching(false);
    }, 300);
  }

  async function selectMember(m: SearchResult) {
    try {
      const res = await fetch(`/api/member/${m.squareId}`);
      const data = await res.json();
      if (data.member) {
        setSelected(data.member);
      } else {
        setSelected({ squareId: m.squareId, firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, tier: "Classic", expiration: null });
      }
    } catch {
      setSelected({ squareId: m.squareId, firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, tier: "Classic", expiration: null });
    }
  }

  async function doCheckIn(guestCount: number) {
    if (!selected) return;
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selected.squareId,
          memberName: `${selected.firstName} ${selected.lastName}`,
          memberEmail: selected.email,
          guestCount,
          tier: selected.tier,
          notes: checkinNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`${selected.firstName} ${selected.lastName} checked in${guestCount > 0 ? ` + ${guestCount} guest${guestCount > 1 ? "s" : ""}` : ""}`);
        reset();
        setTimeout(() => setStatus(null), 4000);
      }
    } catch {
      setStatus("Check-in failed");
      setTimeout(() => setStatus(null), 3000);
    }
  }

  function reset() {
    setSelected(null);
    setQuery("");
    setResults([]);
    setCheckinNotes("");
  }

  const isExpired = selected?.expiration ? new Date(selected.expiration) < new Date() : false;
  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", background: "#333", border: "1px solid #555", borderRadius: "6px", color: "#eee", fontSize: "1rem", outline: "none" };

  return (
    <div style={{ maxWidth: "500px" }}>
      {status && (
        <div style={{ padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", background: status.includes("failed") ? "#4a2a2a" : "#2a4a2a", color: status.includes("failed") ? "#d4a0a0" : "#a0d4a0", fontSize: "0.85rem" }}>
          {status.includes("failed") ? "✕" : "✓"} {status}
        </div>
      )}

      {!selected ? (
        <>
          <input
            type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value); }}
            placeholder="search member name..."
            autoFocus style={inputStyle}
          />
          {searching && <div style={{ color: "#888", padding: "12px 0", fontSize: "0.85rem" }}>Searching...</div>}
          {results.map((m) => (
            <div key={m.squareId} onClick={() => selectMember(m)} style={{ padding: "12px 0", borderBottom: "1px solid #3a3a3a", cursor: "pointer" }}>
              <div>{m.firstName} {m.lastName}</div>
              <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>{m.email}</div>
            </div>
          ))}
          {query.length >= 2 && !searching && results.length === 0 && (
            <div style={{ color: "#888", padding: "16px 0", fontStyle: "italic" }}>No members found</div>
          )}
        </>
      ) : (
        <div style={{ background: "#333", borderRadius: "8px", padding: "24px" }}>
          <div style={{ fontSize: "1.3rem", marginBottom: "4px" }}>{selected.firstName} {selected.lastName}</div>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "4px" }}>{selected.email}</div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px", marginTop: "12px" }}>
            <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "3px", background: isExpired ? "#4a2a2a" : "#2a4a2a", color: isExpired ? "#d4a0a0" : "#a0d4a0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {isExpired ? "EXPIRED" : "ACTIVE"}
            </span>
            <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "3px", background: selected.tier === "Enthusiast" ? "#3a2a5a" : "#3a3a3a", color: selected.tier === "Enthusiast" ? "#c4a0d4" : "#bbb", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {selected.tier}
            </span>
          </div>
          {selected.expiration && (
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "16px" }}>
              {isExpired ? "Expired" : "Through"} {new Date(selected.expiration).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          )}

          {/* Notes field */}
          <input
            type="text" value={checkinNotes}
            onChange={(e) => setCheckinNotes(e.target.value)}
            placeholder="add a note (optional)..."
            style={{ ...inputStyle, marginBottom: "16px", fontSize: "0.85rem", padding: "10px 14px" }}
          />

          {isExpired ? (
            <div style={{ color: "#d4a0a0", fontSize: "0.9rem", marginBottom: "16px" }}>
              Membership expired — renew before checking in.
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => doCheckIn(0)} style={{ flex: 1, padding: "12px", background: "#c5a572", color: "#1a1a1a", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                Check In
              </button>
              {selected.tier === "Enthusiast" && (
                <>
                  <button onClick={() => doCheckIn(1)} style={{ padding: "12px 16px", background: "#444", color: "#ddd", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>+1</button>
                  <button onClick={() => doCheckIn(2)} style={{ padding: "12px 16px", background: "#444", color: "#ddd", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>+2</button>
                </>
              )}
            </div>
          )}

          <button onClick={() => { reset(); setStatus(null); }} style={{ marginTop: "12px", padding: "10px", background: "transparent", color: "#888", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", width: "100%", fontSize: "0.8rem" }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Signup Tab ── */
function SignupTab() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<"Classic" | "Enthusiast">("Classic");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!firstName || !lastName) { setStatus("Name is required"); return; }
    if (!email) { setStatus("Email is required"); return; }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, tier }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus(`✓ ${firstName} ${lastName} signed up as ${tier} — expires ${data.member?.expiration || "1 year"}`);
        setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setTier("Classic");
      } else {
        setStatus(data.error || "Signup failed");
      }
    } catch { setStatus("Connection error"); }

    setSubmitting(false);
  }

  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", background: "#333", border: "1px solid #555", borderRadius: "6px", color: "#eee", fontSize: "1rem", outline: "none", marginBottom: "12px" };

  return (
    <div style={{ maxWidth: "400px" }}>
      {status && (
        <div style={{ padding: "12px 16px", borderRadius: "6px", marginBottom: "20px", background: status.startsWith("✓") ? "#2a4a2a" : "#4a2a2a", color: status.startsWith("✓") ? "#a0d4a0" : "#d4a0a0", fontSize: "0.85rem" }}>
          {status}
        </div>
      )}

      <input style={inputStyle} placeholder="first name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoCapitalize="words" />
      <input style={inputStyle} placeholder="last name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoCapitalize="words" />
      <input style={inputStyle} placeholder="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={inputStyle} placeholder="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />

      <div style={{ marginTop: "8px", marginBottom: "20px" }}>
        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "10px" }}>Membership</div>
        <div style={{ display: "flex", gap: "10px" }}>
          {(["Classic", "Enthusiast"] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)} style={{
              flex: 1, padding: "14px",
              background: tier === t ? "#c5a572" : "#333",
              color: tier === t ? "#1a1a1a" : "#aaa",
              border: tier === t ? "none" : "1px solid #555",
              borderRadius: "6px", cursor: "pointer",
              fontWeight: tier === t ? "bold" : "normal", fontSize: "0.9rem",
            }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{
        width: "100%", padding: "14px",
        background: submitting ? "#666" : "#c5a572",
        color: "#1a1a1a", border: "none", borderRadius: "6px",
        cursor: submitting ? "not-allowed" : "pointer",
        fontWeight: "bold", fontSize: "1rem",
      }}>
        {submitting ? "Creating..." : "Sign Up Member"}
      </button>
    </div>
  );
}

/* ── History Tab ── */
function HistoryTab() {
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchHistory(d: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/checkins?date=${d}`);
      if (res.ok) {
        const data = await res.json();
        setCheckins(data.checkins || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { fetchHistory(date); }, [date]);

  function shiftDate(days: number) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  }

  const totalGuests = checkins.reduce((sum, c) => sum + (c.guestCount || 0), 0);
  const uniqueMembers = checkins.length;
  const newCount = checkins.filter((c) => c.isNew).length;
  const isToday = date === new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Date nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "24px" }}>
        <button onClick={() => shiftDate(-1)} style={{ padding: "8px 14px", background: "#333", color: "#ccc", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", fontSize: "1rem" }}>←</button>
        <input
          type="date" value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: "8px 14px", background: "#333", border: "1px solid #555", borderRadius: "6px", color: "#eee", fontSize: "0.9rem", outline: "none" }}
        />
        <button onClick={() => shiftDate(1)} disabled={isToday} style={{ padding: "8px 14px", background: "#333", color: isToday ? "#555" : "#ccc", border: "1px solid #555", borderRadius: "6px", cursor: isToday ? "default" : "pointer", fontSize: "1rem" }}>→</button>
        {!isToday && (
          <button onClick={() => setDate(new Date().toISOString().split("T")[0])} style={{ padding: "8px 14px", background: "#444", color: "#c5a572", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.8rem" }}>Today</button>
        )}
      </div>

      {loading ? (
        <div style={{ color: "#888", padding: "30px 0", textAlign: "center" }}>Loading...</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: "flex", gap: "30px", marginBottom: "24px" }}>
            {[
              { val: uniqueMembers, label: "Members" },
              { val: totalGuests, label: "Guests" },
              { val: uniqueMembers + totalGuests, label: "Total" },
              { val: newCount, label: "New" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#c5a572" }}>{s.val}</div>
                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* List */}
          <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
            <div style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444" }}>
              {formatDate(new Date(date + "T12:00:00"))}
            </div>
            {checkins.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No check-ins this day</div>
            ) : (
              checkins.map((c) => (
                <div key={c.id} style={{ padding: "10px 0", borderBottom: "1px solid #3a3a3a", opacity: c.checkoutTime ? 0.7 : 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap" }}>
                      <span>{c.memberName}</span>
                      <span style={BADGE(c.memberTier === "enthusiast" ? "#3a2a5a" : "#3a3a3a", c.memberTier === "enthusiast" ? "#c4a0d4" : "#bbb")}>
                        {c.memberTier === "enthusiast" ? "ENT" : "CLS"}
                      </span>
                      {c.isNew && <span style={BADGE("#4a6741", "#b5d4aa")}>NEW</span>}
                      {c.guestCount > 0 && <span style={BADGE("#5a4a2a", "#d4c4a0")}>+{c.guestCount}</span>}
                      <span style={{ fontSize: "0.6rem", marginLeft: "6px", color: "#888" }}>{c.visitCount} visits</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666", flexShrink: 0 }}>
                      {formatTime(c.timestamp)}
                      {c.checkoutTime && <span> → {formatTime(c.checkoutTime)}</span>}
                    </div>
                  </div>
                  {c.notes && (
                    <div style={{ fontSize: "0.7rem", color: "#a0a0a0", fontStyle: "italic", marginTop: "4px" }}>{c.notes}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
