"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";

// ── Types ──────────────────────────────────────────────────────
interface SquareItem {
  name: string;
  catalogId: string;
  quantity: number;
  gross: number;
}

interface SquareData {
  date: string;
  venue: string;
  status: string;
  warnings: string[];
  orders: { count: number };
  payments: { count: number };
  reconciliation: { passed: boolean; delta: number; message: string };
  // Flat backwards-compat fields
  orderCount: number;
  gross: number;
  discounts: number;
  netSales: number;
  tips: number;
  tax: number;
  processingFees: number;
  items: SquareItem[];
}

interface RecipeIngredient {
  id: string;
  amount: string | number;
  unit: string;
  ingredient: {
    id: string;
    name: string;
    costPerUnit: string | number | null;
    bottleCost: string | number | null;
    bottleSizeOz: string | number | null;
  };
}

interface Recipe {
  id: string;
  name: string;
  menuPrice: string | number | null;
  category: string;
  recipeIngredients: RecipeIngredient[];
}

interface DrinkSold {
  name: string;
  catalogId: string;
  quantity: number;
  revenue: number;
  recipe: Recipe | null;
  cogsPerDrink: number | null;
  totalCogs: number | null;
  margin: number | null; // percentage
}

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
  tips: number;
  taxCollected: number;
  artistCap: number;
  fees: number;
  netProfit: number;
}

interface Report {
  date: string;
  venueId: string;
  nightType: string;
  lineItems: LineItem[];
  summary: ReportSummary;
}

// ── Helpers ────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function fmt(n: number): string {
  return "$" + Math.abs(n).toFixed(2);
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function calcIngredientCost(ing: RecipeIngredient["ingredient"]): number {
  const cpu = parseFloat(String(ing.costPerUnit || "0"));
  if (cpu > 0) return cpu;
  // Derive from bottle cost / size
  const bc = parseFloat(String(ing.bottleCost || "0"));
  const bs = parseFloat(String(ing.bottleSizeOz || "0"));
  if (bc > 0 && bs > 0) return bc / bs;
  return 0;
}

function calcRecipeCogs(recipe: Recipe): number {
  return recipe.recipeIngredients.reduce((sum, ri) => {
    const amount = parseFloat(String(ri.amount)) || 0;
    const costPerUnit = calcIngredientCost(ri.ingredient);
    return sum + amount * costPerUnit;
  }, 0);
}

// ── Component ──────────────────────────────────────────────────
export default function PnlPage() {
  const params = useParams();
  const venue = params.venue as string;

  // Tab state
  const [tab, setTab] = useState<"entry" | "history">("entry");

  // History state
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  // Entry state
  const [date, setDate] = useState(todayStr());
  const [pulling, setPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Square data (auto-filled)
  const [squareData, setSquareData] = useState<SquareData | null>(null);

  // Recipes (for COGS matching)
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  // Manual inputs
  const [nightTags, setNightTags] = useState<Set<string>>(new Set(["regular"]));

  function toggleTag(tag: string) {
    setNightTags((prev) => {
      const next = new Set(prev);
      // Opening and Regular are mutually exclusive (both are the early shift)
      if (tag === "opening") {
        next.delete("regular");
        if (next.has("opening")) { next.delete("opening"); next.add("regular"); }
        else next.add("opening");
        return next;
      }
      if (tag === "regular") {
        next.delete("opening");
        if (next.has("regular") && next.size > 1) { next.delete("regular"); }
        else next.add("regular");
        if (next.size === 0) next.add("regular");
        return next;
      }
      // Afters toggles independently
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      if (next.size === 0) next.add("regular");
      return next;
    });
  }

  const [laborHours, setLaborHours] = useState("");
  const [laborRate, setLaborRate] = useState("");
  const [labor2Hours, setLabor2Hours] = useState("");
  const [labor2Rate, setLabor2Rate] = useState("");
  const [artistOption, setArtistOption] = useState<"none" | "absent" | "present">("absent");

  // ── Fetch recipes on mount ────────────────────────────────
  useEffect(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data) => setRecipes(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ── Fetch history ─────────────────────────────────────────
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

  // ── Pull from Square ──────────────────────────────────────
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
      setSquareData(data);
    } catch {
      setPullError("Could not connect to Square");
    }
    setPulling(false);
  }

  // ── Match drinks to recipes ───────────────────────────────
  const drinksSold: DrinkSold[] = useMemo(() => {
    if (!squareData?.items) return [];
    return squareData.items.map((item) => {
      // Case-insensitive name match
      const recipe = recipes.find(
        (r) => r.name.toLowerCase().trim() === item.name.toLowerCase().trim()
      ) || null;

      let cogsPerDrink: number | null = null;
      let totalCogs: number | null = null;
      let margin: number | null = null;

      if (recipe) {
        cogsPerDrink = calcRecipeCogs(recipe);
        totalCogs = cogsPerDrink * item.quantity;
        const pricePerDrink = item.gross / item.quantity;
        margin = pricePerDrink > 0 ? ((pricePerDrink - cogsPerDrink) / pricePerDrink) * 100 : 0;
      }

      return {
        name: item.name,
        catalogId: item.catalogId,
        quantity: item.quantity,
        revenue: item.gross,
        recipe,
        cogsPerDrink,
        totalCogs,
        margin,
      };
    });
  }, [squareData, recipes]);

  // ── Calculated values ─────────────────────────────────────
  const grossNum = squareData?.gross ?? 0;
  const discountsNum = squareData?.discounts ?? 0;
  const taxNum = squareData?.tax ?? 0;
  const tipsNum = squareData?.tips ?? 0;
  const feesNum = squareData?.processingFees ?? 0;
  const netSales = grossNum - discountsNum;
  const netCollected = grossNum - discountsNum + taxNum + tipsNum;

  const totalCogs = drinksSold.reduce((s, d) => s + (d.totalCogs ?? 0), 0);
  const unmatchedCount = drinksSold.filter((d) => !d.recipe).length;

  const laborHoursNum = parseFloat(laborHours) || 0;
  const laborRateNum = parseFloat(laborRate) || 0;
  const labor2HoursNum = parseFloat(labor2Hours) || 0;
  const labor2RateNum = parseFloat(labor2Rate) || 0;
  const laborWages1 = laborHoursNum * laborRateNum;
  const laborWages2 = labor2HoursNum * labor2RateNum;
  const laborWages = laborWages1 + laborWages2;

  const capPercent = artistOption === "present" ? 10 : artistOption === "absent" ? 2 : 0;
  const artistCap = netSales * (capPercent / 100);

  const grossProfit = netSales - totalCogs;
  const totalLaborCost = laborWages + tipsNum; // hourly + tips payout
  const netProfit = grossProfit - totalLaborCost - artistCap - feesNum;

  // ── Save ──────────────────────────────────────────────────
  async function handleSave() {
    if (!squareData) return;
    setSaving(true);

    await fetch("/api/pnl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueSlug: venue,
        date,
        nightType: Array.from(nightTags).join(","),
        gross: grossNum,
        discounts: discountsNum || null,
        cogs: totalCogs || null,
        labor: laborWages || null,
        tips: tipsNum || null,
        taxCollected: taxNum || null,
        artistPresent: artistOption === "present",
        artistCapPercent: capPercent,
        artistCap: artistCap || null,
        fees: feesNum || null,
      }),
    });

    // Reset
    setSquareData(null);
    setNightTags(new Set(["regular"]));
    setLaborHours("");
    setLaborRate("");
    setLabor2Hours("");
    setLabor2Rate("");
    setArtistOption("absent");
    setSaving(false);
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
    // Clear square data — this is a manual edit of saved data
    setSquareData(null);
    setTab("entry");
    // Re-pull to get fresh data
    setTimeout(() => {
      const btn = document.querySelector(".btn-square-pull") as HTMLButtonElement;
      if (btn) btn.click();
    }, 100);
  }

  // ── History stats ─────────────────────────────────────────
  const filteredReports = useMemo(() => {
    if (filter === "all" || filter === "week" || filter === "month") return reports;
    return reports.filter((r) => {
      const tags = (r.nightType || "regular").split(",");
      return tags.includes(filter);
    });
  }, [reports, filter]);

  const totalRevenue = filteredReports.reduce((s, r) => s + r.summary.netSales, 0);
  const totalProfit = filteredReports.reduce((s, r) => s + r.summary.netProfit, 0);
  const avgProfit = filteredReports.length > 0 ? totalProfit / filteredReports.length : 0;

  const aftersNights = reports.filter((r) => (r.nightType || "").includes("afters"));
  const openingNights = reports.filter((r) => (r.nightType || "").includes("opening"));
  const regularNights = reports.filter((r) => !r.nightType || r.nightType === "regular");
  const aftersRevenue = aftersNights.reduce((s, r) => s + r.summary.netSales, 0);
  const regularRevenue = regularNights.reduce((s, r) => s + r.summary.netSales, 0);

  if (loading) {
    return <div className="empty-state"><p>Loading...</p></div>;
  }

  // ── Styles ────────────────────────────────────────────────
  const sectionStyle: React.CSSProperties = {
    marginBottom: "24px",
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    color: "#888",
    marginBottom: "12px",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "13px",
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left" as const,
    padding: "6px 8px",
    borderBottom: "1px solid #333",
    color: "#888",
    fontSize: "11px",
    fontWeight: 500,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px",
    borderBottom: "1px solid #222",
  };

  const tdRight: React.CSSProperties = {
    ...tdStyle,
    textAlign: "right" as const,
  };

  const tdNum: React.CSSProperties = {
    ...tdStyle,
    textAlign: "right" as const,
    fontVariantNumeric: "tabular-nums",
  };

  const noRecipeStyle: React.CSSProperties = {
    color: "#666",
    fontStyle: "italic",
    fontSize: "11px",
  };

  const toggleGroupStyle: React.CSSProperties = {
    display: "flex",
    gap: "0",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid #333",
  };

  const toggleBtnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "10px 12px",
    background: active ? "#fff" : "transparent",
    color: active ? "#000" : "#888",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: active ? 600 : 400,
    transition: "all 0.15s ease",
  });

  const rowHighlight: React.CSSProperties = {
    background: "#111",
    borderRadius: "6px",
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    fontWeight: 600,
    fontSize: "15px",
  };

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
          {/* Date + Pull */}
          <div className="pnl-date-row">
            <div className="pnl-date-input">
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  setSquareData(null);
                }}
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

          {/* Night Segments */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "1px", color: "#888", marginBottom: "8px" }}>Night Type</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {([
                ["regular", "Regular", "#555"],
                ["opening", "Opening", "#e11d48"],
                ["afters", "Afters", "#7c3aed"],
              ] as const).map(([val, label, color]) => {
                const active = nightTags.has(val);
                return (
                  <button
                    key={val}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "20px",
                      border: `1.5px solid ${active ? color : "#333"}`,
                      background: active ? color : "transparent",
                      color: active ? "#fff" : "#888",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: active ? 600 : 400,
                      transition: "all 0.15s ease",
                    }}
                    onClick={() => toggleTag(val)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: "6px", fontSize: "12px", color: "#555" }}>
              {nightTags.has("opening") && nightTags.has("afters") && "Opening 6-10 → Afters 10+"}
              {nightTags.has("regular") && nightTags.has("afters") && "Regular 6-10 → Afters 10+"}
              {nightTags.has("regular") && !nightTags.has("afters") && nightTags.size === 1 && "Standard 6pm-12am"}
              {nightTags.has("opening") && !nightTags.has("afters") && nightTags.size === 1 && "Gallery opening 6-10pm"}
              {nightTags.has("afters") && nightTags.size === 1 && "Late night only"}
            </div>
          </div>

          {/* ── REVENUE ─────────────────────────────────── */}
          {squareData && (
            <>
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Revenue</div>
                <div className="pnl-preview" style={{ marginBottom: 0 }}>
                  <div className="pnl-row">
                    <span>Gross Sales</span>
                    <span>{fmt(grossNum)}</span>
                  </div>
                  {discountsNum > 0 && (
                    <div className="pnl-row dim">
                      <span>Discounts</span>
                      <span>-{fmt(discountsNum)}</span>
                    </div>
                  )}
                  <div className="pnl-row bold">
                    <span>Net Sales</span>
                    <span>{fmt(netSales)}</span>
                  </div>
                  <div className="pnl-divider" />
                  <div className="pnl-row dim">
                    <span>Tax Collected</span>
                    <span>{fmt(taxNum)}</span>
                  </div>
                  <div className="pnl-row dim">
                    <span>Tips</span>
                    <span>{fmt(tipsNum)}</span>
                  </div>
                  <div className="pnl-row dim">
                    <span>Processing Fees</span>
                    <span>-{fmt(feesNum)}</span>
                  </div>
                  <div className="pnl-divider" />
                  <div className="pnl-row bold">
                    <span>Net Collected</span>
                    <span>{fmt(netCollected - feesNum)}</span>
                  </div>
                </div>
              </div>

              {/* ── DRINKS SOLD ──────────────────────────── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>
                  Drinks Sold
                  {unmatchedCount > 0 && (
                    <span style={{ color: "#f59e0b", marginLeft: "8px", textTransform: "none", letterSpacing: 0 }}>
                      ({unmatchedCount} unmatched)
                    </span>
                  )}
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={tableStyle}>
                    <thead>
                      <tr>
                        <th style={thStyle}>Drink</th>
                        <th style={{ ...thStyle, textAlign: "center", width: "50px" }}>Qty</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Revenue</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>COGS</th>
                        <th style={{ ...thStyle, textAlign: "right" }}>Margin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drinksSold.map((d, i) => (
                        <tr key={i}>
                          <td style={tdStyle}>
                            {d.name}
                            {!d.recipe && <span style={noRecipeStyle}> — no recipe</span>}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>{d.quantity}</td>
                          <td style={tdNum}>{fmt(d.revenue)}</td>
                          <td style={tdNum}>
                            {d.totalCogs !== null ? fmt(d.totalCogs) : "—"}
                          </td>
                          <td style={{
                            ...tdNum,
                            color: d.margin !== null
                              ? d.margin >= 75 ? "#22c55e" : d.margin >= 60 ? "#eab308" : "#ef4444"
                              : "#666",
                          }}>
                            {d.margin !== null ? `${d.margin.toFixed(0)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ ...tdStyle, fontWeight: 600, borderTop: "1px solid #444" }}>
                          Total
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600, borderTop: "1px solid #444" }}>
                          {drinksSold.reduce((s, d) => s + d.quantity, 0)}
                        </td>
                        <td style={{ ...tdNum, fontWeight: 600, borderTop: "1px solid #444" }}>
                          {fmt(grossNum)}
                        </td>
                        <td style={{ ...tdNum, fontWeight: 600, borderTop: "1px solid #444" }}>
                          {fmt(totalCogs)}
                        </td>
                        <td style={{
                          ...tdNum,
                          fontWeight: 600,
                          borderTop: "1px solid #444",
                          color: netSales > 0
                            ? (((netSales - totalCogs) / netSales) * 100) >= 75 ? "#22c55e" : "#eab308"
                            : "#888",
                        }}>
                          {netSales > 0
                            ? `${(((netSales - totalCogs) / netSales) * 100).toFixed(0)}%`
                            : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* ── LABOR ────────────────────────────────── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Labor</div>
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px" }}>Bartender 1</div>
                <div className="form-grid">
                  <div className="form-row">
                    <label className="form-label">Hours</label>
                    <input
                      type="number"
                      className="form-input"
                      value={laborHours}
                      onChange={(e) => setLaborHours(e.target.value)}
                      placeholder="0"
                      step="0.5"
                    />
                  </div>
                  <div className="form-row">
                    <label className="form-label">Rate</label>
                    <input
                      type="number"
                      className="form-input"
                      value={laborRate}
                      onChange={(e) => setLaborRate(e.target.value)}
                      placeholder="0.00"
                      step="0.50"
                    />
                  </div>
                </div>

                {/* Bartender 2 — show if afters is selected or if any values entered */}
                {(nightTags.has("afters") || labor2Hours || labor2Rate) && (
                  <>
                    <div style={{ fontSize: "12px", color: "#666", marginBottom: "8px", marginTop: "12px" }}>Bartender 2</div>
                    <div className="form-grid">
                      <div className="form-row">
                        <label className="form-label">Hours</label>
                        <input
                          type="number"
                          className="form-input"
                          value={labor2Hours}
                          onChange={(e) => setLabor2Hours(e.target.value)}
                          placeholder="0"
                          step="0.5"
                        />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Rate</label>
                        <input
                          type="number"
                          className="form-input"
                          value={labor2Rate}
                          onChange={(e) => setLabor2Rate(e.target.value)}
                          placeholder="0.00"
                          step="0.50"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pnl-preview" style={{ marginTop: "12px", marginBottom: 0 }}>
                  {laborWages1 > 0 && (
                    <div className="pnl-row dim">
                      <span>BT1 ({laborHoursNum}h × ${laborRateNum.toFixed(2)})</span>
                      <span>{fmt(laborWages1)}</span>
                    </div>
                  )}
                  {laborWages2 > 0 && (
                    <div className="pnl-row dim">
                      <span>BT2 ({labor2HoursNum}h × ${labor2RateNum.toFixed(2)})</span>
                      <span>{fmt(laborWages2)}</span>
                    </div>
                  )}
                  <div className="pnl-row dim">
                    <span>Tips</span>
                    <span>{fmt(tipsNum)}</span>
                  </div>
                  <div className="pnl-divider" />
                  <div className="pnl-row bold">
                    <span>Total Staff Comp</span>
                    <span>{fmt(laborWages + tipsNum)}</span>
                  </div>
                </div>
              </div>

              {/* ── ARTIST ───────────────────────────────── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Artist Compensation</div>
                <div style={toggleGroupStyle}>
                  <button
                    style={toggleBtnStyle(artistOption === "none")}
                    onClick={() => setArtistOption("none")}
                  >
                    None (0%)
                  </button>
                  <button
                    style={toggleBtnStyle(artistOption === "absent")}
                    onClick={() => setArtistOption("absent")}
                  >
                    Absent (2%)
                  </button>
                  <button
                    style={toggleBtnStyle(artistOption === "present")}
                    onClick={() => setArtistOption("present")}
                  >
                    Present (10%)
                  </button>
                </div>
                {capPercent > 0 && (
                  <div style={{ marginTop: "8px", color: "#888", fontSize: "13px" }}>
                    {capPercent}% of {fmt(netSales)} = {fmt(artistCap)}
                  </div>
                )}
              </div>

              {/* ── TONIGHT'S P&L ────────────────────────── */}
              <div style={sectionStyle}>
                <div style={sectionTitleStyle}>Tonight's P&L</div>
                <div className="pnl-preview">
                  <div className="pnl-row">
                    <span>Gross Sales</span>
                    <span>{fmt(grossNum)}</span>
                  </div>
                  {discountsNum > 0 && (
                    <div className="pnl-row dim">
                      <span>Discounts</span>
                      <span>-{fmt(discountsNum)}</span>
                    </div>
                  )}
                  <div className="pnl-row bold">
                    <span>Net Sales</span>
                    <span>{fmt(netSales)}</span>
                  </div>
                  <div className="pnl-divider" />
                  <div className="pnl-row dim">
                    <span>COGS {netSales > 0 ? `(${((totalCogs / netSales) * 100).toFixed(0)}%)` : ""}</span>
                    <span>-{fmt(totalCogs)}</span>
                  </div>
                  <div className="pnl-row">
                    <span>Gross Profit</span>
                    <span>{fmt(grossProfit)}</span>
                  </div>
                  <div className="pnl-divider" />
                  {laborWages > 0 && (
                    <div className="pnl-row dim">
                      <span>Hourly Labor</span>
                      <span>-{fmt(laborWages)}</span>
                    </div>
                  )}
                  {tipsNum > 0 && (
                    <div className="pnl-row dim">
                      <span>Tips Payout</span>
                      <span>-{fmt(tipsNum)}</span>
                    </div>
                  )}
                  {capPercent > 0 && (
                    <div className="pnl-row dim">
                      <span>Artist CAP ({capPercent}%)</span>
                      <span>-{fmt(artistCap)}</span>
                    </div>
                  )}
                  {feesNum > 0 && (
                    <div className="pnl-row dim">
                      <span>Processing Fees</span>
                      <span>-{fmt(feesNum)}</span>
                    </div>
                  )}
                  <div className="pnl-divider" />
                  <div className={`pnl-row bold ${netProfit >= 0 ? "positive" : "negative"}`}>
                    <span>Net Profit</span>
                    <span>
                      {netProfit < 0 ? "-" : ""}
                      {fmt(netProfit)}
                    </span>
                  </div>
                </div>

                {/* Tax reserve callout */}
                {taxNum > 0 && (
                  <div style={{
                    marginTop: "12px",
                    padding: "10px 14px",
                    background: "#1a1a2e",
                    border: "1px solid #2a2a4a",
                    borderRadius: "8px",
                    fontSize: "13px",
                    color: "#a0a0d0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}>
                    <span>Tax Reserve → set aside</span>
                    <span style={{ fontWeight: 600, color: "#c0c0f0" }}>{fmt(taxNum)}</span>
                  </div>
                )}
              </div>

              {/* Save */}
              <button
                className="btn btn-full"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Report"}
              </button>
            </>
          )}

          {/* Show empty state if no Square data pulled yet */}
          {!squareData && !pulling && (
            <div className="empty-state" style={{ marginTop: "40px" }}>
              <p>Select a date and pull from Square to start.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === "history" && (
        <div className="pnl-history">
          {/* Summary Cards */}
          <div className="pnl-summary-grid">
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Total Revenue</div>
              <div className="pnl-summary-value">{fmt(totalRevenue)}</div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Total Profit</div>
              <div className={`pnl-summary-value ${totalProfit >= 0 ? "positive" : "negative"}`}>
                {totalProfit < 0 ? "-" : ""}
                {fmt(totalProfit)}
              </div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Avg/Night</div>
              <div className={`pnl-summary-value ${avgProfit >= 0 ? "positive" : "negative"}`}>
                {avgProfit < 0 ? "-" : ""}
                {fmt(avgProfit)}
              </div>
            </div>
            <div className="pnl-summary-card">
              <div className="pnl-summary-label">Reports</div>
              <div className="pnl-summary-value">{filteredReports.length}</div>
            </div>
          </div>

          {/* Night type breakdown */}
          {(aftersNights.length > 0 || openingNights.length > 0) && filter !== "afters" && filter !== "regular" && filter !== "opening" && (
            <div style={{
              display: "flex",
              gap: "12px",
              marginBottom: "16px",
              fontSize: "12px",
              color: "#888",
              flexWrap: "wrap",
            }}>
              <span>
                <span style={{ fontWeight: 600 }}>{regularNights.length}</span> regular
                ({fmt(regularRevenue)})
              </span>
              {openingNights.length > 0 && (
                <span>
                  <span style={{ color: "#e11d48", fontWeight: 600 }}>{openingNights.length}</span> openings
                </span>
              )}
              {aftersNights.length > 0 && (
                <span>
                  <span style={{ color: "#7c3aed", fontWeight: 600 }}>{aftersNights.length}</span> afters
                  ({fmt(aftersRevenue)})
                </span>
              )}
            </div>
          )}

          {/* Filter */}
          <div className="pnl-filter">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-input"
              style={{ maxWidth: 200 }}
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option disabled>──────</option>
              <option value="regular">Regular Nights</option>
              <option value="opening">Openings</option>
              <option value="afters">Afters</option>
            </select>
          </div>

          {/* Report Cards */}
          {filteredReports.length === 0 ? (
            <div className="empty-state">
              <p>No reports yet.</p>
              <p className="empty-hint">Enter your first nightly P&L to get started.</p>
            </div>
          ) : (
            <div>
              {filteredReports.map((report) => {
                const s = report.summary;
                const isExpanded = expandedDate === report.date;
                const margin = s.netSales > 0 ? (s.netProfit / s.netSales) * 100 : 0;
                const nt = (report.nightType || "regular").split(",");

                return (
                  <div key={report.date} className="drink-card">
                    <div
                      className="drink-header"
                      onClick={() => setExpandedDate(isExpanded ? null : report.date)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span className="drink-name">{formatDate(report.date)}</span>
                        {nt.includes("opening") && (
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            background: "#e11d48",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}>Opening</span>
                        )}
                        {nt.includes("afters") && (
                          <span style={{
                            fontSize: "10px",
                            fontWeight: 600,
                            background: "#7c3aed",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}>Afters</span>
                        )}
                        <span className="drink-price">{fmt(s.netSales)}</span>
                      </div>
                      <div className="drink-stats">
                        <div>
                          <span className="cogs-label">Profit</span>
                          <span className={s.netProfit >= 0 ? "positive" : "negative"}>
                            {s.netProfit < 0 ? "-" : ""}
                            {fmt(s.netProfit)}
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
                            <span>{fmt(s.gross)}</span>
                          </div>
                          {s.discounts > 0 && (
                            <div className="pnl-row dim">
                              <span>Discounts</span>
                              <span>-{fmt(s.discounts)}</span>
                            </div>
                          )}
                          <div className="pnl-row bold">
                            <span>Net Sales</span>
                            <span>{fmt(s.netSales)}</span>
                          </div>
                          <div className="pnl-divider" />
                          {s.cogs > 0 && (
                            <div className="pnl-row dim">
                              <span>
                                COGS ({s.netSales > 0 ? ((s.cogs / s.netSales) * 100).toFixed(0) : 0}%)
                              </span>
                              <span>-{fmt(s.cogs)}</span>
                            </div>
                          )}
                          {s.labor > 0 && (
                            <div className="pnl-row dim">
                              <span>Hourly Labor</span>
                              <span>-{fmt(s.labor)}</span>
                            </div>
                          )}
                          {s.tips > 0 && (
                            <div className="pnl-row dim">
                              <span>Tips Payout</span>
                              <span>-{fmt(s.tips)}</span>
                            </div>
                          )}
                          {s.artistCap > 0 && (
                            <div className="pnl-row dim">
                              <span>
                                Artist CAP
                                {report.lineItems.find((i) => i.category === "artist_compensation")
                                  ?.subcategory === "present"
                                  ? " (10%)"
                                  : " (2%)"}
                              </span>
                              <span>-{fmt(s.artistCap)}</span>
                            </div>
                          )}
                          {s.fees > 0 && (
                            <div className="pnl-row dim">
                              <span>Fees</span>
                              <span>-{fmt(s.fees)}</span>
                            </div>
                          )}
                          <div className="pnl-divider" />
                          <div className={`pnl-row bold ${s.netProfit >= 0 ? "positive" : "negative"}`}>
                            <span>Net Profit</span>
                            <span>
                              {s.netProfit < 0 ? "-" : ""}
                              {fmt(s.netProfit)}
                            </span>
                          </div>
                          {s.taxCollected > 0 && (
                            <div className="pnl-row dim" style={{ marginTop: "8px", color: "#8888bb" }}>
                              <span>Tax Reserve</span>
                              <span>{fmt(s.taxCollected)}</span>
                            </div>
                          )}
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
