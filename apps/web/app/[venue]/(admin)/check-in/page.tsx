"use client";
import { useState, useEffect } from "react";

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

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function CheckInPage() {
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
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {active.length}
          </div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>
            Checked In
          </div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {totalGuests}
          </div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>
            Guests
          </div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {newCount}
          </div>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888" }}>
            New
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
        {/* Check-ins */}
        <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
          <div style={{
            textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em",
            color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444"
          }}>
            Checked In Tonight
          </div>
          {checkins.length === 0 ? (
            <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>
              No check-ins yet
            </div>
          ) : (
            checkins.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: "1px solid #3a3a3a",
                  opacity: c.checkoutTime ? 0.5 : 1,
                }}
              >
                <div>
                  <div style={{ textDecoration: c.checkoutTime ? "line-through" : "none" }}>
                    {c.memberName}
                    {c.isNew && (
                      <span style={{
                        fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px",
                        background: "#4a6741", color: "#b5d4aa", marginLeft: "8px",
                        textTransform: "uppercase", letterSpacing: "0.08em"
                      }}>NEW</span>
                    )}
                    {c.guestCount > 0 && (
                      <span style={{
                        fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px",
                        background: "#5a4a2a", color: "#d4c4a0", marginLeft: "8px",
                        textTransform: "uppercase", letterSpacing: "0.08em"
                      }}>+{c.guestCount} GUEST{c.guestCount > 1 ? "S" : ""}</span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>
                    {c.memberEmail || ""}
                  </div>
                </div>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>
                  {formatTime(c.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Signups */}
          <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
            <div style={{
              textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em",
              color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444"
            }}>
              New Signups Tonight
            </div>
            {signups.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>
                No signups yet
              </div>
            ) : (
              signups.map((s, i) => (
                <div key={i} style={{ padding: "10px 0", borderBottom: "1px solid #3a3a3a" }}>
                  <div>{s.firstName} {s.lastName}</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>
                    {s.email || ""} · {formatTime(s.timestamp)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Renewals */}
          <div style={{ background: "#333", borderRadius: "8px", padding: "20px" }}>
            <div style={{
              textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "0.15em",
              color: "#888", marginBottom: "15px", paddingBottom: "10px", borderBottom: "1px solid #444"
            }}>
              Renewal Requests
            </div>
            {renewals.length === 0 ? (
              <div style={{ color: "#666", fontStyle: "italic", padding: "20px 0", textAlign: "center" }}>
                No renewal requests
              </div>
            ) : (
              renewals.map((r, i) => (
                <div key={i} style={{
                  padding: "10px 0", borderBottom: "1px solid #3a3a3a",
                  display: "flex", justifyContent: "space-between", alignItems: "center"
                }}>
                  <div>
                    <div>{r.memberName}</div>
                    <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>
                      {formatTime(r.timestamp)}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px",
                    background: "#2a4a5a", color: "#a0c4d4",
                    textTransform: "uppercase", letterSpacing: "0.08em"
                  }}>WANTS TO RENEW</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ fontSize: "0.7rem", color: "#555", textAlign: "center", marginTop: "20px" }}>
        Auto-refreshes every 15 seconds
      </div>
    </div>
  );
}
