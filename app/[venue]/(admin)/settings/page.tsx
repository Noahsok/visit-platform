"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

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

export default function SettingsPage() {
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
