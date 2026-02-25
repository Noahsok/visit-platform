"use client";

import { useState, useEffect, useRef } from "react";

interface CheckIn {
  id: number;
  memberId: string;
  memberName: string;
  memberEmail: string;
  guestCount: number;
  isNew: boolean;
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

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
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
  padding: "8px 20px",
  cursor: "pointer",
  fontSize: "0.8rem",
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: "#c5a572",
  borderBottom: "2px solid #c5a572",
  transition: "all 0.2s",
};

export default function StaffCheckInPage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "checkin" | "signup">("dashboard");

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #444", paddingBottom: "0" }}>
        <div
          style={activeTab === "dashboard" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("dashboard")}
        >
          Dashboard
        </div>
        <div
          style={activeTab === "checkin" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("checkin")}
        >
          Check In
        </div>
        <div
          style={activeTab === "signup" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("signup")}
        >
          New Member
        </div>
      </div>

      {activeTab === "dashboard" && <DashboardTab />}
      {activeTab === "checkin" && <CheckInTab />}
      {activeTab === "signup" && <SignupTab />}
    </div>
  );
}

/* ── Dashboard Tab ── */
function DashboardTab() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [signups, setSignups] = useState<Signup[]>([]);
  const [renewals, setRenewals] = useState<Renewal[]>([]);

  async function fetchAll() {
    try {
      const [cRes, sRes, rRes] = await Promise.all([
        fetch("/api/checkins").catch(() => null),
        fetch("/api/signups").catch(() => null),
        fetch("/api/renewal-requests").catch(() => null),
      ]);

      if (cRes?.ok) {
        const data = await cRes.json();
        setCheckins(data.checkins || []);
      }
      if (sRes?.ok) {
        const data = await sRes.json();
        setSignups(data.signups || []);
      }
      if (rRes?.ok) {
        const data = await rRes.json();
        setRenewals(data.requests || []);
      }
    } catch (e) {
      console.error("Fetch error:", e);
    }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, []);

  const active = checkins.filter((c) => !c.checkoutTime);
  const totalGuests = checkins.reduce((sum, c) => sum + (c.guestCount || 0), 0);
  const newCount = checkins.filter((c) => c.isNew).length;

  return (
    <div>
      {/* Stats Row */}
      <div style={{ display: "flex", gap: "40px", marginBottom: "30px" }}>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>{active.length}</div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>Checked In</div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>{totalGuests}</div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>Guests</div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>{newCount}</div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>New</div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Check-ins */}
        <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
          <div style={{ textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em", color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444" }}>
            Checked In Tonight
          </div>
          {checkins.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>No check-ins yet</div>
          ) : (
            checkins.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #3a3a3a", opacity: c.checkoutTime ? 0.5 : 1 }}>
                <div>
                  <div style={{ textDecoration: c.checkoutTime ? "line-through" : "none" }}>
                    {c.memberName}
                    {c.isNew && (
                      <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px", background: "#4a6741", color: "#b5d4aa", marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>NEW</span>
                    )}
                    {c.guestCount > 0 && (
                      <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px", background: "#5a4a2a", color: "#d4c4a0", marginLeft: "8px", textTransform: "uppercase", letterSpacing: "0.08em" }}>+{c.guestCount} GUEST{c.guestCount > 1 ? "S" : ""}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>{c.memberEmail || ""}</div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>{formatTime(c.timestamp)}</div>
              </div>
            ))
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
                  <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px", background: "#2a4a5a", color: "#a0c4d4", textTransform: "uppercase", letterSpacing: "0.08em" }}>WANTS TO RENEW</span>
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
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  function doSearch(q: string) {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.members || []);
      } catch {
        setResults([]);
      }
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
        setSelected({
          squareId: m.squareId,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
          phone: m.phone,
          tier: "Classic",
          expiration: null,
        });
      }
    } catch {
      setSelected({
        squareId: m.squareId,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone,
        tier: "Classic",
        expiration: null,
      });
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
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`${selected.firstName} ${selected.lastName} checked in${guestCount > 0 ? ` + ${guestCount} guest${guestCount > 1 ? "s" : ""}` : ""}`);
        setSelected(null);
        setQuery("");
        setResults([]);
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
    setStatus(null);
  }

  const isExpired = selected?.expiration ? new Date(selected.expiration) < new Date() : false;

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
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              doSearch(e.target.value);
            }}
            placeholder="search member name..."
            autoFocus
            style={{ width: "100%", padding: "12px 16px", background: "#333", border: "1px solid #555", borderRadius: "6px", color: "#eee", fontSize: "1rem", outline: "none" }}
          />
          {searching && <div style={{ color: "#888", padding: "12px 0", fontSize: "0.85rem" }}>Searching...</div>}
          {results.map((m) => (
            <div
              key={m.squareId}
              onClick={() => selectMember(m)}
              style={{ padding: "12px 0", borderBottom: "1px solid #3a3a3a", cursor: "pointer" }}
            >
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
            <span style={{ fontSize: "0.7rem", padding: "3px 10px", borderRadius: "3px", background: "#3a3a3a", color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {selected.tier}
            </span>
          </div>
          {selected.expiration && (
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "20px" }}>
              {isExpired ? "Expired" : "Through"} {new Date(selected.expiration).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
          )}

          {isExpired ? (
            <div style={{ color: "#d4a0a0", fontSize: "0.9rem", marginBottom: "16px" }}>
              Membership expired — renew before checking in.
            </div>
          ) : (
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button onClick={() => doCheckIn(0)} style={{ flex: 1, padding: "12px", background: "#c5a572", color: "#1a1a1a", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "0.85rem" }}>
                Check In
              </button>
              {selected.tier === "Enthusiast" && (
                <>
                  <button onClick={() => doCheckIn(1)} style={{ padding: "12px 16px", background: "#444", color: "#ddd", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                    +1
                  </button>
                  <button onClick={() => doCheckIn(2)} style={{ padding: "12px 16px", background: "#444", color: "#ddd", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.85rem" }}>
                    +2
                  </button>
                </>
              )}
            </div>
          )}

          <button onClick={reset} style={{ marginTop: "12px", padding: "10px", background: "transparent", color: "#888", border: "1px solid #555", borderRadius: "6px", cursor: "pointer", width: "100%", fontSize: "0.8rem" }}>
            Back
          </button>
        </div>
      )}
    </div>
  );
}

/* ── New Member / Signup Tab ── */
function SignupTab() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<"Classic" | "Enthusiast">("Classic");
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!firstName || !lastName) {
      setStatus("Name is required");
      return;
    }
    if (!email) {
      setStatus("Email is required");
      return;
    }

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
        setFirstName("");
        setLastName("");
        setEmail("");
        setPhone("");
        setTier("Classic");
      } else {
        setStatus(data.error || "Signup failed");
      }
    } catch {
      setStatus("Connection error");
    }

    setSubmitting(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "#333",
    border: "1px solid #555",
    borderRadius: "6px",
    color: "#eee",
    fontSize: "1rem",
    outline: "none",
    marginBottom: "12px",
  };

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
          <button
            onClick={() => setTier("Classic")}
            style={{
              flex: 1,
              padding: "14px",
              background: tier === "Classic" ? "#c5a572" : "#333",
              color: tier === "Classic" ? "#1a1a1a" : "#aaa",
              border: tier === "Classic" ? "none" : "1px solid #555",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: tier === "Classic" ? "bold" : "normal",
              fontSize: "0.9rem",
            }}
          >
            Classic
          </button>
          <button
            onClick={() => setTier("Enthusiast")}
            style={{
              flex: 1,
              padding: "14px",
              background: tier === "Enthusiast" ? "#c5a572" : "#333",
              color: tier === "Enthusiast" ? "#1a1a1a" : "#aaa",
              border: tier === "Enthusiast" ? "none" : "1px solid #555",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: tier === "Enthusiast" ? "bold" : "normal",
              fontSize: "0.9rem",
            }}
          >
            Enthusiast
          </button>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "14px",
          background: submitting ? "#666" : "#c5a572",
          color: "#1a1a1a",
          border: "none",
          borderRadius: "6px",
          cursor: submitting ? "not-allowed" : "pointer",
          fontWeight: "bold",
          fontSize: "1rem",
        }}
      >
        {submitting ? "Creating..." : "Sign Up Member"}
      </button>
    </div>
  );
}
