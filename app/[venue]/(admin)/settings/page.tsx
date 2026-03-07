"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";

// ─── Staff types & constants ──────────────────────────────────────────

interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  passcode: string | null;
  isActive: boolean;
}

const ROLES = ["owner", "manager", "bartender", "door", "prep"] as const;

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  bartender: "Bartender",
  door: "Door",
  prep: "Prep",
};

const ROLE_TIERS: Record<string, string> = {
  owner: "Admin",
  manager: "Admin",
  bartender: "Staff",
  door: "Staff",
  prep: "Staff",
};

function generatePasscode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// ─── Invite types ─────────────────────────────────────────────────────

interface InviteData {
  id: string;
  token: string;
  status: string;
  inviteeName: string | null;
  createdAt: string;
  expiresAt: string | null;
}

interface Inviter {
  id: string;
  name: string;
  tier: string;
  inviteAllowance: number;
  invites: InviteData[];
}

interface Guest {
  id: string;
  name: string;
  phone: string | null;
  inviterName: string;
  createdAt: string;
}

interface Stats {
  totalInviters: number;
  totalGuests: number;
  pending: number;
  used: number;
  expired: number;
  revoked: number;
}

interface DirectInvite {
  id: string;
  token: string;
  status: string;
  createdAt: string;
  expiresAt: string | null;
  grantAllowance: number | null;
  invitee: { id: string; name: string } | null;
}

interface SquareResult {
  squareId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ─── Shared tab styles ────────────────────────────────────────────────

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

// ─── Main settings page ───────────────────────────────────────────────

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "invites" | "config">("staff");

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "25px",
          borderBottom: "1px solid #444",
        }}
      >
        <div
          style={activeTab === "staff" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("staff")}
        >
          Staff
        </div>
        <div
          style={activeTab === "invites" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("invites")}
        >
          Invites
        </div>
        <div
          style={activeTab === "config" ? TAB_ACTIVE : TAB_STYLE}
          onClick={() => setActiveTab("config")}
        >
          Config
        </div>
      </div>

      {activeTab === "staff" && <StaffPanel />}
      {activeTab === "invites" && <InvitesPanel />}
      {activeTab === "config" && (
        <div style={{ color: "#888", fontSize: 14 }}>
          Venue configuration coming soon.
        </div>
      )}
    </div>
  );
}

// ─── Staff panel ──────────────────────────────────────────────────────

function StaffPanel() {
  const params = useParams();
  const venue = params.venue as string;
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<string>("bartender");
  const [formPasscode, setFormPasscode] = useState("");

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/staff?venue=${venue}`);
      const data = await res.json();
      setStaff(data.staff || []);
    } catch {
      console.error("Failed to fetch staff");
    } finally {
      setLoading(false);
    }
  }, [venue]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  function openCreateModal() {
    setEditingStaff(null);
    setFormName("");
    setFormEmail("");
    setFormRole("bartender");
    setFormPasscode(generatePasscode());
    setError("");
    setShowModal(true);
  }

  function openEditModal(member: StaffMember) {
    setEditingStaff(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormRole(member.role);
    setFormPasscode(member.passcode || "");
    setError("");
    setShowModal(true);
  }

  async function handleSave() {
    setError("");

    if (!formName.trim() || !formEmail.trim()) {
      setError("Name and email are required");
      return;
    }
    if (!/^\d{4}$/.test(formPasscode)) {
      setError("Passcode must be exactly 4 digits");
      return;
    }

    setSaving(true);

    try {
      if (editingStaff) {
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            passcode: formPasscode,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update");
          setSaving(false);
          return;
        }
      } else {
        const res = await fetch("/api/staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            email: formEmail.trim(),
            role: formRole,
            passcode: formPasscode,
            venue,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create");
          setSaving(false);
          return;
        }
      }

      setShowModal(false);
      await fetchStaff();
    } catch {
      setError("Connection error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(member: StaffMember) {
    if (!confirm(`Remove ${member.name}? They won't be able to sign in.`)) return;

    try {
      await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      setExpandedId(null);
      await fetchStaff();
    } catch {
      console.error("Failed to delete");
    }
  }

  return (
    <div>
      <div className="section-header">
        <h2>Staff</h2>
        <button className="btn" onClick={openCreateModal}>
          + Add Staff
        </button>
      </div>

      {loading && <p style={{ color: "var(--text-muted)" }}>Loading...</p>}

      {!loading && staff.length === 0 && (
        <div className="empty-state">
          <p>No staff members yet. Add your first team member.</p>
        </div>
      )}

      {staff.map((member) => {
        const isExpanded = expandedId === member.id;
        return (
          <div
            key={member.id}
            className="drink-card"
            style={{ borderLeftColor: isExpanded ? "var(--accent)" : "transparent" }}
          >
            <div
              className="drink-header"
              onClick={() => setExpandedId(isExpanded ? null : member.id)}
              style={{ cursor: "pointer" }}
            >
              <div>
                <div className="drink-name">{member.name}</div>
                <div className="drink-stats">
                  <span
                    style={{
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "3px",
                      background:
                        ROLE_TIERS[member.role] === "Admin"
                          ? "rgba(201, 169, 110, 0.15)"
                          : "rgba(255,255,255,0.06)",
                      color:
                        ROLE_TIERS[member.role] === "Admin"
                          ? "var(--accent)"
                          : "var(--text-muted)",
                    }}
                  >
                    {ROLE_LABELS[member.role] || member.role}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "16px",
                  letterSpacing: "3px",
                  color: "var(--text-muted)",
                }}
              >
                {member.passcode || "----"}
              </div>
            </div>

            {isExpanded && (
              <div className="breakdown">
                <table className="breakdown-table">
                  <tbody>
                    <tr>
                      <td style={{ color: "var(--text-muted)", width: "80px" }}>Email</td>
                      <td>{member.email}</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-muted)" }}>Access</td>
                      <td>{ROLE_TIERS[member.role] || "Staff"} tier</td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--text-muted)" }}>Passcode</td>
                      <td style={{ fontFamily: "monospace", letterSpacing: "3px" }}>
                        {member.passcode || "Not set"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="breakdown-actions">
                  <button className="btn-small" onClick={() => openEditModal(member)}>
                    Edit
                  </button>
                  <button className="btn-small-danger" onClick={() => handleDelete(member)}>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {editingStaff ? "Edit Staff" : "Add Staff"}
            </div>

            <div className="form-row">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="First Last"
                autoFocus
              />
            </div>

            <div className="form-row">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="name@visit.bar"
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]} ({ROLE_TIERS[r]})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Passcode</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    className="form-input"
                    value={formPasscode}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setFormPasscode(v);
                    }}
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 digits"
                    style={{
                      fontFamily: "monospace",
                      fontSize: "18px",
                      letterSpacing: "6px",
                      textAlign: "center",
                      flex: 1,
                    }}
                  />
                  <button
                    className="btn-small"
                    type="button"
                    onClick={() => setFormPasscode(generatePasscode())}
                    title="Generate random passcode"
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <p style={{ color: "var(--danger)", fontSize: "13px", marginTop: "8px" }}>
                {error}
              </p>
            )}

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingStaff ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Invites panel ────────────────────────────────────────────────────

function InvitesPanel() {
  const [inviters, setInviters] = useState<Inviter[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [directInvites, setDirectInvites] = useState<DirectInvite[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SquareResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/invites");
      const data = await res.json();
      setInviters(data.inviters);
      setGuests(data.guests);
      setDirectInvites(data.directInvites || []);
      setStats(data.stats);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const adminAction = async (body: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Action failed");
        setActionLoading(false);
        return null;
      }
      await fetchData();
      setActionLoading(false);
      return data;
    } catch {
      alert("Connection error");
      setActionLoading(false);
      return null;
    }
  };

  const searchSquare = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      setSearchResults(data.members || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(() => searchSquare(value), 300);
  };

  if (loading) return <div style={{ color: "#888" }}>Loading...</div>;

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
          <StatBadge label="Pending" value={stats.pending} color="#c9a96e" />
          <StatBadge label="Used" value={stats.used} color="#6abf69" />
          <StatBadge label="Expired" value={stats.expired} color="#8a4a4a" />
          <StatBadge label="Revoked" value={stats.revoked} color="#666" />
          <StatBadge label="Guests" value={stats.totalGuests} color="#888" />
        </div>
      )}

      {/* Invite a member — search Square then generate invite link */}
      <div style={{ marginBottom: 28 }}>
        <label style={labelStyle}>Invite someone to the app</label>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="form-input"
          style={{ maxWidth: 400 }}
        />
        {searching && (
          <div style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Searching...</div>
        )}
        {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
          <div style={{ color: "#666", fontSize: 13, marginTop: 8 }}>No members found</div>
        )}
        {searchResults.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 300, overflowY: "auto" }}>
            {searchResults.map((m) => {
              const fullName = `${m.firstName} ${m.lastName}`.trim();
              const detail = m.email || m.phone || "";
              return (
                <div
                  key={m.squareId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "#141414",
                    border: "1px solid #262626",
                    borderRadius: 4,
                    marginBottom: 4,
                  }}
                >
                  <div>
                    <span style={{ color: "#e5e5e5", fontSize: 14 }}>{fullName}</span>
                    {detail && (
                      <span style={{ color: "#888", fontSize: 12, marginLeft: 8 }}>
                        {detail}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      const data = await adminAction({
                        action: "invite_member",
                        name: fullName,
                        grantAllowance: 3,
                      });
                      if (data?.inviteUrl) {
                        await navigator.clipboard.writeText(data.inviteUrl);
                        setCopiedToken(m.squareId);
                        setTimeout(() => setCopiedToken(null), 3000);
                      }
                    }}
                    className="btn"
                    style={{
                      padding: "6px 14px",
                      fontSize: 12,
                      background: copiedToken === m.squareId ? "#2d5a2d" : undefined,
                    }}
                    disabled={actionLoading}
                  >
                    {copiedToken === m.squareId ? "Link copied!" : "Invite"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sent invites — admin can copy link or cancel */}
      {directInvites.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <label style={labelStyle}>Sent invites ({directInvites.length})</label>
          {directInvites.map((inv) => (
            <div key={inv.id} style={cardStyle}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      color: statusColor(inv.status),
                      fontWeight: 600,
                      fontSize: 11,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 3,
                      background: `${statusColor(inv.status)}15`,
                    }}
                  >
                    {inv.status}
                  </span>
                  <span style={{ color: "#e5e5e5" }}>
                    {inv.invitee?.name || "Unclaimed"}
                  </span>
                  <span style={{ color: "#555", fontSize: 11 }}>
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {inv.status === "pending" && (
                    <>
                      <button
                        onClick={async () => {
                          const url = `https://visit-members.vercel.app/invite/${inv.token}`;
                          await navigator.clipboard.writeText(url);
                          setCopiedToken(inv.id);
                          setTimeout(() => setCopiedToken(null), 2000);
                        }}
                        className="btn-outline"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                      >
                        {copiedToken === inv.id ? "Copied" : "Copy link"}
                      </button>
                      <button
                        onClick={() =>
                          adminAction({ action: "revoke_token", tokenId: inv.id })
                        }
                        className="btn-danger"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Members — simple list */}
      {inviters.length > 0 && (
        <>
          <label style={labelStyle}>Members ({inviters.length})</label>
          {inviters.map((m) => (
            <div key={m.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#e5e5e5" }}>
                  {m.name}
                </span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {m.inviteAllowance} remaining
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── Shared components & styles ───────────────────────────────────────

function StatBadge({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "#141414",
        border: "1px solid #262626",
        padding: "10px 16px",
        borderRadius: 6,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#888" }}>{label}</span>
    </div>
  );
}

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "#c9a96e";
    case "used":
      return "#6abf69";
    case "expired":
      return "#8a4a4a";
    case "revoked":
      return "#666";
    default:
      return "#888";
  }
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.7rem",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  color: "#888",
  marginBottom: 8,
};

const cardStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #262626",
  padding: "12px 14px",
  marginBottom: 6,
  borderRadius: 6,
};

