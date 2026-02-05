"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface LineItem {
  id: string;
  category: string;
  subcategory: string | null;
  description: string;
  amount: number;
  source: string;
}

interface ReportSummary {
  gross: number;
  discounts: number;
  netSales: number;
  cogs: number;
  labor: number;
  artistCap: number;
  fees: number;
  netProfit: number;
}

interface Report {
  date: string;
  venueId: string;
  lineItems: LineItem[];
  summary: ReportSummary;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return "$" + Math.abs(n).toFixed(2);
}

function todayStr(): string {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

export default function PnlPage() {
  const params = useParams();
  const venue = params.venue as string;

  const [tab, setTab] = useState<"entry" | "history">("entry");
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  // Entry form state
  const [date, setDate] = useState(todayStr());
  const [gross, setGross] = useState("");
  const [discounts, setDiscounts] = useState("");
  const [cogs, setCogs] = useState("");
  const [labor, setLabor] = useState("");
  const [fees, setFees] = useState("");
  const [artistPresent, setArtistPresent] = useState(false);

  const fetchReports = useCallback(async () => {
    const period = filter === "all" ? "" : `&period=${filter}`;
    const res = await fetch(`/api/pnl?venue=${venue}${period}`);
    const data = await res.json();
    setReports(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [venue, filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Pull from Square
  async function pullFromSquare() {
    setPulling(true);
    setPullError(null);
    try {
      const res = await fetch(`/api/square/daily?venue=${venue}&date=${date}`);
      const data = await res.json();

      if (!res.ok) {
        setPullError(data.error || "Failed to pull from Square");
        setPulling(false);
        return;
      }

      if (data.orderCount === 0) {
        setPullError("No orders found for this date");
        setPulling(false);
        return;
      }

      // Auto-fill the form
      setGross(data.gross.toFixed(2));
      setDiscounts(data.discounts > 0 ? data.discounts.toFixed(2) : "");
      setFees(data.processingFees > 0 ? data.processingFees.toFixed(2) : "");
    } catch (err) {
      setPullError("Could not connect to Square");
    }
    setPulling(false);
  }

  // Auto-calculate
  const grossNum = parseFloat(gross) || 0;
  const discountsNum = parseFloat(discounts) || 0;
  const cogsNum = parseFloat(cogs) || 0;
  const laborNum = parseFloat(labor) || 0;
  const feesNum = parseFloat(fees) || 0;
  const netSales = grossNum - discountsNum;
  const capPercent = artistPresent ? 10 : 2;
  const artistCap = netSales * (capPercent / 100);
  const grossProfit = netSales - cogsNum;
  const netProfit = grossProfit - laborNum - artistCap - feesNum;

  async function handleSave() {
    if (!gross) return;
    setSaving(true);

    await fetch("/api/pnl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: venue,
        date,
        gross: grossNum,
        discounts: discountsNum || null,
        cogs: cogsNum || null,
        labor: laborNum || null,
        artistPresent,
        artistCapPercent: capPercent,
        artistCap: artistCap || null,
        fees: feesNum || null,
      }),
    });

    // Reset form
    setGross("");
    setDiscounts("");
    setCogs("");
    setLabor("");
    setFees("");
    setArtistPresent(false);
    setSaving(false);

    // Refresh and show history
    await fetchReports();
    setTab("history");
  }

  async function handleDelete(reportDate: string) {
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/pnl/${reportDate}?venue=${venue}`, { method: "DELETE" });
    setExpandedDate(null);
    fetchReports();
  }

  function loadReport(report: Report) {
    setDate(report.date);
    setGross(report.summary.gross.toString());
    setDiscounts(report.summary.discounts > 0 ? report.summary.discounts.toString() : "");
    setCogs(report.summary.cogs > 0 ? report.summary.cogs.toString() : "");
    setLabor(report.summary.labor > 0 ? report.summary.labor.toString() : "");
    setFees(report.summary.fees > 0 ? report.summary.fees.toString() : "");

    const artistItem = report.lineItems.find((i) => i.category === "artist_compensation");
    setArtistPresent(artistItem?.subcategory === "present");

    setTab("entry");
  }

  // History summary stats
  const totalRevenue = reports.reduce((s, r) => s + r.summary.netSales, 0);
  const totalProfit = reports.reduce((s, r) => s + r.summary.netProfit, 0);
  const avgProfit = reports.length > 0 ? totalProfit / reports.length : 0;

  if (loading) {
    return <div className="empty-state"><p>Loading...</p></div>;
  }

  return (
    <div>
      {/* Sub-tabs */}
      <div className="pnl-tabs">
        <button
          className={`pnl-tab ${tab === "entry" ? "active" : ""}`}
          onClick={() => setTab("entry")}
        >
          Nightly Entry
        </button>
        <button
          className={`pnl-tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      {/* ===== ENTRY TAB ===== */}
      {tab === "entry" && (
        <div className="pnl-entry">
          <div className="pnl-date-row">
            <div className="pnl-date-input">
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <button
              className="btn-square-pull"
              onClick={pullFromSquare}
              disabled={pulling}
            >
              {pulling ? "Pulling..." : "Pull from Square"}
            </button>
          </div>
          {pullError && <div className="pull-error">{pullError}</div>}

          <div className="pnl-section-label">Revenue</div>
          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">Gross Sales</label>
              <input
                type="number"
                className="form-input"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                placeholder="0.00"
                step="0.01"
                autoFocus
              />
            </div>
            <div className="form-row">
              <label className="form-label">Discounts</label>
              <input
                type="number"
                className="form-input"
                value={discounts}
                onChange={(e) => setDiscounts(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="pnl-section-label">Expenses</div>
          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">COGS</label>
              <input
                type="number"
                className="form-input"
                value={cogs}
                onChange={(e) => setCogs(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="form-row">
              <label className="form-label">Labor</label>
              <input
                type="number"
                className="form-input"
                value={labor}
                onChange={(e) => setLabor(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-row">
              <label className="form-label">Fees</label>
              <input
                type="number"
                className="form-input"
                value={fees}
                onChange={(e) => setFees(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>
            <div className="form-row">
              <label className="form-label">Artist Present?</label>
              <div className="artist-toggle">
                <button
                  className={`toggle-btn ${!artistPresent ? "active" : ""}`}
                  onClick={() => setArtistPresent(false)}
                >
                  No ({2}%)
                </button>
                <button
                  className={`toggle-btn ${artistPresent ? "active" : ""}`}
                  onClick={() => setArtistPresent(true)}
                >
                  Yes ({10}%)
                </button>
              </div>
            </div>
          </div>

          {/* Live P&L Preview */}
          <div className="pnl-preview">
            <div className="pnl-preview-title">Tonight's P&L</div>
            <div className="pnl-row">
              <span>Gross Sales</span>
              <span>{formatCurrency(grossNum)}</span>
            </div>
            {discountsNum > 0 && (
              <div className="pnl-row dim">
                <span>Discounts</span>
                <span>-{formatCurrency(discountsNum)}</span>
              </div>
            )}
            <div className="pnl-row bold">
              <span>Net Sales</span>
              <span>{formatCurrency(netSales)}</span>
            </div>
            <div className="pnl-divider" />
            {cogsNum > 0 && (
              <div className="pnl-row dim">
                <span>COGS {netSales > 0 ? `(${((cogsNum / netSales) * 100).toFixed(0)}%)` : ""}</span>
                <span>-{formatCurrency(cogsNum)}</span>
              </div>
            )}
            <div className="pnl-row">
              <span>Gross Profit</span>
              <span>{formatCurrency(grossProfit)}</span>
            </div>
            <div className="pnl-divider" />
            {laborNum > 0 && (
              <div className="pnl-row dim">
                <span>Labor</span>
                <span>-{formatCurrency(laborNum)}</span>
              </div>
            )}
            <div className="pnl-row dim">
              <span>Artist CAP ({capPercent}%)</span>
              <span>-{formatCurrency(artistCap)}</span>
            </div>
            {feesNum > 0 && (
              <div className="pnl-row dim">
                <span>Fees</span>
                <span>-{formatCurrency(feesNum)}</span>
              </div>
            )}
            <div className="pnl-divider" />
            <div className={`pnl-row bold ${netProfit >= 0 ? "positive" : "negative"}`}>
              <span>Net Profit</span>
              <span>{netProfit < 0 ? "-" : ""}{formatCurrency(netProfit)}</span>
            </div>
          </div>

          <button
            className="btn btn-full"
            onClick={handleSave}
            disabled={saving || !gross}
          >
            {saving ? "Saving..." : "Save Report"}
          </button>
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === "history" && (
        <div className="pnl-history">
          {/* Summary Cards */}
          <div className="pnl-summary-grid">
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Total Revenue</div>
              <div className="pnl-summary-value">{formatCurrency(totalRevenue)}</div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Total Profit</div>
              <div className={`pnl-summary-value ${totalProfit >= 0 ? "positive" : "negative"}`}>
                {totalProfit < 0 ? "-" : ""}{formatCurrency(totalProfit)}
              </div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Avg/Night</div>
              <div className={`pnl-summary-value ${avgProfit >= 0 ? "positive" : "negative"}`}>
                {avgProfit < 0 ? "-" : ""}{formatCurrency(avgProfit)}
              </div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Reports</div>
              <div className="pnl-summary-value">{reports.length}</div>
            </div>
          </div>

          {/* Filter */}
          <div className="pnl-filter">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input"
              style={{ maxWidth: 180 }}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Report Cards */}
          {reports.length === 0 ? (
            <div className="empty-state">
              <p>No reports yet.</p>
              <p className="empty-hint">Enter your first nightly P&L to get started.</p>
            </div>
          ) : (
            <div>
              {reports.map((report) => {
                const s = report.summary;
                const isExpanded = expandedDate === report.date;
                const margin = s.netSales > 0 ? (s.netProfit / s.netSales) * 100 : 0;

                return (
                  <div key={report.date} className="drink-card">
                    <div
                      className="drink-header"
                      onClick={() => setExpandedDate(isExpanded ? null : report.date)}
                    >
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <span className="drink-name">{formatDate(report.date)}</span>
                        <span className="drink-price">{formatCurrency(s.netSales)}</span>
                      </div>
                      <div className="drink-stats">
                        <div>
                          <span className="cogs-label">Profit</span>
                          <span className={s.netProfit >= 0 ? "positive" : "negative"}>
                            {s.netProfit < 0 ? "-" : ""}{formatCurrency(s.netProfit)}
                          </span>
                        </div>
                        <div>
                          <span className="margin-label">Margin</span>
                          <span>{margin.toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="breakdown">
                        <div className="pnl-breakdown-rows">
                          <div className="pnl-row">
                            <span>Gross Sales</span>
                            <span>{formatCurrency(s.gross)}</span>
                          </div>
                          {s.discounts > 0 && (
                            <div className="pnl-row dim">
                              <span>Discounts</span>
                              <span>-{formatCurrency(s.discounts)}</span>
                            </div>
                          )}
                          <div className="pnl-row bold">
                            <span>Net Sales</span>
                            <span>{formatCurrency(s.netSales)}</span>
                          </div>
                          <div className="pnl-divider" />
                          {s.cogs > 0 && (
                            <div className="pnl-row dim">
                              <span>COGS ({s.netSales > 0 ? ((s.cogs / s.netSales) * 100).toFixed(0) : 0}%)</span>
                              <span>-{formatCurrency(s.cogs)}</span>
                            </div>
                          )}
                          {s.labor > 0 && (
                            <div className="pnl-row dim">
                              <span>Labor</span>
                              <span>-{formatCurrency(s.labor)}</span>
                            </div>
                          )}
                          {s.artistCap > 0 && (
                            <div className="pnl-row dim">
                              <span>
                                Artist CAP
                                {report.lineItems.find((i) => i.category === "artist_compensation")?.subcategory === "present"
                                  ? " (10%)"
                                  : " (2%)"}
                              </span>
                              <span>-{formatCurrency(s.artistCap)}</span>
                            </div>
                          )}
                          {s.fees > 0 && (
                            <div className="pnl-row dim">
                              <span>Fees</span>
                              <span>-{formatCurrency(s.fees)}</span>
                            </div>
                          )}
                          <div className="pnl-divider" />
                          <div className={`pnl-row bold ${s.netProfit >= 0 ? "positive" : "negative"}`}>
                            <span>Net Profit</span>
                            <span>{s.netProfit < 0 ? "-" : ""}{formatCurrency(s.netProfit)}</span>
                          </div>
                        </div>

                        <div className="breakdown-actions">
                          <button className="btn-outline" onClick={() => loadReport(report)}>
                            Edit
                          </button>
                          <button
                            className="btn-danger"
                            onClick={() => handleDelete(report.date)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
