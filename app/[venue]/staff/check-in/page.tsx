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

function formatTime(ts: string) {
  if (!ts) return "";
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export default function StaffCheckInPage() {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchCheckins() {
    try {
      const res = await fetch("/api/checkins");
      if (res.ok) {
        const data = await res.json();
        setCheckins(data.checkins || []);
      }
    } catch {
      console.error("Failed to fetch check-ins");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCheckins();
    const interval = setInterval(fetchCheckins, 15000);
    return () => clearInterval(interval);
  }, []);

  const active = checkins.filter((c) => !c.checkoutTime);
  const totalGuests = active.reduce((sum, c) => sum + (c.guestCount || 0), 0);
  const totalPeople = active.length + totalGuests;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "#888" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      {/* Stats */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          marginBottom: "24px",
          padding: "16px 0",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {active.length}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#888",
            }}
          >
            Members
          </div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {totalGuests}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#888",
            }}
          >
            Guests
          </div>
        </div>
        <div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#c5a572" }}>
            {totalPeople}
          </div>
          <div
            style={{
              fontSize: "0.7rem",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#888",
            }}
          >
            In House
          </div>
        </div>
      </div>

      {/* Check-in List */}
      {checkins.length === 0 ? (
        <div
          style={{
            color: "#666",
            fontStyle: "italic",
            padding: "40px 0",
            textAlign: "center",
          }}
        >
          No check-ins yet tonight
        </div>
      ) : (
        checkins.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 0",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              opacity: c.checkoutTime ? 0.4 : 1,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "15px",
                  textDecoration: c.checkoutTime ? "line-through" : "none",
                }}
              >
                {c.memberName}
                {c.isNew && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: "#4a6741",
                      color: "#b5d4aa",
                      marginLeft: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    NEW
                  </span>
                )}
                {c.guestCount > 0 && (
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      background: "#5a4a2a",
                      color: "#d4c4a0",
                      marginLeft: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    +{c.guestCount}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#666" }}>
              {formatTime(c.timestamp)}
            </div>
          </div>
        ))
      )}

      <div
        style={{
          fontSize: "0.7rem",
          color: "#555",
          textAlign: "center",
          marginTop: "20px",
        }}
      >
        Auto-refreshes every 15 seconds
      </div>
    </div>
  );
}
