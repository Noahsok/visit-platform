"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import FatWashCalculator from "./FatWashCalculator";

// ============================================
// TYPES
// ============================================

interface PantryItem {
  id: string;
  name: string;
  purchaseUnit: string;
  purchaseSize: number;
  purchaseCost: number;
  baseUnit: string;
  costPerBaseUnit: number | null;
  supplier: string | null;
}

interface PrepIngredient {
  name: string;
  amount: string;
  unit?: string;
  pantryItemId?: string;
}

interface PrepRecipe {
  id: string;
  name: string;
  type: string;
  description: string | null;
  usedIn: string | null;
  baseRatio: string | null;
  yieldAmount: string | null;
  ingredients: PrepIngredient[] | null;
  scalingTable: {
    columns: string[];
    rows: { label: string; [key: string]: string }[];
  } | null;
  method: string[] | null;
  filtration: string | null;
  storage: string | null;
  shelfLife: string | null;
  qualityCheck: string | null;
  sortOrder: number;
  yieldOz: number | null;
  batchCost: number | null;
  costPerOz: number | null;
  linkedIngredientId: string | null;
}

const TYPES = [
  { value: "syrup", label: "Syrup" },
  { value: "cordial", label: "Cordial" },
  { value: "oleo", label: "Oleo" },
  { value: "fat_wash", label: "Fat Wash" },
  { value: "infusion", label: "Infusion" },
  { value: "garnish", label: "Garnish" },
  { value: "other", label: "Other" },
];

const PURCHASE_UNITS_WEIGHT = [
  { value: "lb", label: "lb" },
  { value: "kg", label: "kg" },
  { value: "oz", label: "oz" },
  { value: "g", label: "g" },
];

const PURCHASE_UNITS_VOLUME = [
  { value: "l", label: "L" },
  { value: "ml", label: "ml" },
  { value: "gal", label: "gal" },
  { value: "fl_oz", label: "fl oz" },
];

const ALL_PURCHASE_UNITS = [...PURCHASE_UNITS_WEIGHT, ...PURCHASE_UNITS_VOLUME,
  { value: "each", label: "each" },
];

function typeLabel(t: string): string {
  return TYPES.find((x) => x.value === t)?.label || t;
}

function typeBadgeClass(t: string): string {
  const map: Record<string, string> = {
    syrup: "badge-syrup",
    cordial: "badge-cordial",
    oleo: "badge-oleo",
    fat_wash: "badge-fatwash",
    infusion: "badge-infusion",
    garnish: "badge-garnish",
    other: "badge-other",
  };
  return map[t] || "badge-other";
}

function formatCurrency(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `$${Number(n).toFixed(2)}`;
}

function formatCost4(n: number | null | undefined): string {
  if (n == null) return "\u2014";
  return `$${Number(n).toFixed(4)}`;
}

function parseAmount(amount: string): {
  value: number; unit: string; raw: string; scalable: boolean;
} {
  const raw = amount.trim();
  if (/^(to |as needed)/i.test(raw)) return { value: 0, unit: "", raw, scalable: false };
  const match = raw.match(/^~?(\d+(?:\.\d+)?)\s*(.*)/);
  if (match) return { value: parseFloat(match[1]), unit: match[2] || "", raw, scalable: true };
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) return { value: parseFloat(numMatch[1]), unit: raw.replace(numMatch[0], "").trim(), raw, scalable: true };
  return { value: 0, unit: "", raw, scalable: false };
}

function parseYield(yieldStr: string | null): number {
  if (!yieldStr) return 0;
  const match = yieldStr.match(/~?(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

function formatScaled(value: number, unit: string): string {
  if (value === 0) return "\u2014";
  const rounded = Math.round(value * 10) / 10;
  const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return unit ? `${str}${unit}` : str;
}

const BOTTLE_SIZES = [375, 500, 750, 1000, 1500];

// =============================================
// PANTRY SECTION COMPONENT
// =============================================
function PantrySection({ pantryItems, onRefresh }: { pantryItems: PantryItem[]; onRefresh: () => void }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PantryItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("lb");
  const [purchaseSize, setPurchaseSize] = useState("");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [baseUnit, setBaseUnit] = useState("g");
  const [supplier, setSupplier] = useState("");

  function openModal(item?: PantryItem) {
    if (item) {
      setEditing(item);
      setName(item.name);
      setPurchaseUnit(item.purchaseUnit);
      setPurchaseSize(String(item.purchaseSize));
      setPurchaseCost(String(item.purchaseCost));
      setBaseUnit(item.baseUnit);
      setSupplier(item.supplier || "");
    } else {
      setEditing(null);
      setName(""); setPurchaseUnit("lb"); setPurchaseSize(""); setPurchaseCost(""); setBaseUnit("g"); setSupplier("");
    }
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }

  async function handleSave() {
    if (!name.trim() || !purchaseSize || !purchaseCost) return;
    setSaving(true);
    try {
      await fetch("/api/pantry-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id, name: name.trim(), purchaseUnit,
          purchaseSize: parseFloat(purchaseSize), purchaseCost: parseFloat(purchaseCost),
          baseUnit, supplier: supplier.trim() || null,
        }),
      });
      closeModal();
      onRefresh();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this raw ingredient?")) return;
    await fetch("/api/pantry-items", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    onRefresh();
  }

  return (
    <div style={{ marginBottom: "40px" }}>
      <div className="section-header">
        <h2 className="section-title">Raw Ingredients</h2>
        <button className="btn" onClick={() => openModal()}>+ New Raw Ingredient</button>
      </div>

      {pantryItems.length === 0 ? (
        <div className="empty-state">
          <p>No raw ingredients yet.</p>
          <p className="empty-hint">Add sugar, honey, citrus, etc. with purchase prices to calculate prep recipe costs.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>NAME</th>
                <th>PURCHASE</th>
                <th>COST</th>
                <th>COST/UNIT</th>
                <th>SUPPLIER</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pantryItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.purchaseSize} {ALL_PURCHASE_UNITS.find((u) => u.value === item.purchaseUnit)?.label || item.purchaseUnit}</td>
                  <td>{formatCurrency(item.purchaseCost)}</td>
                  <td>{item.costPerBaseUnit ? `${formatCost4(Number(item.costPerBaseUnit))}/${item.baseUnit}` : "\u2014"}</td>
                  <td style={{ color: "#888" }}>{item.supplier || "\u2014"}</td>
                  <td>
                    <button className="btn-outline btn-small" onClick={() => openModal(item)}>Edit</button>
                    <button className="remove-btn" style={{ marginLeft: "8px" }} onClick={() => handleDelete(item.id)}>{"\u00d7"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? "Edit Raw Ingredient" : "New Raw Ingredient"}</h2>
            <div className="form-row">
              <label className="form-label">Name</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sugar, Honey, Ginger" autoFocus />
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Purchase Size</label>
                <input type="number" className="form-input" value={purchaseSize} onChange={(e) => setPurchaseSize(e.target.value)} placeholder="e.g. 5" step="any" />
              </div>
              <div className="form-row">
                <label className="form-label">Unit</label>
                <select className="form-input" value={purchaseUnit} onChange={(e) => {
                  setPurchaseUnit(e.target.value);
                  const isWeight = PURCHASE_UNITS_WEIGHT.some((u) => u.value === e.target.value);
                  if (e.target.value === "each") setBaseUnit("each");
                  else setBaseUnit(isWeight ? "g" : "ml");
                }}>
                  <optgroup label="Weight">
                    {PURCHASE_UNITS_WEIGHT.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
                  </optgroup>
                  <optgroup label="Volume">
                    {PURCHASE_UNITS_VOLUME.map((u) => (<option key={u.value} value={u.value}>{u.label}</option>))}
                  </optgroup>
                  <option value="each">each</option>
                </select>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Purchase Cost ($)</label>
                <input type="number" className="form-input" value={purchaseCost} onChange={(e) => setPurchaseCost(e.target.value)} placeholder="e.g. 4.00" step="0.01" />
              </div>
              <div className="form-row">
                <label className="form-label">Recipe Unit</label>
                <select className="form-input" value={baseUnit} onChange={(e) => setBaseUnit(e.target.value)}>
                  <option value="g">grams (g)</option>
                  <option value="ml">milliliters (ml)</option>
                  <option value="each">each</option>
                </select>
              </div>
            </div>
            {purchaseSize && purchaseCost && (
              <div style={{ background: "#2a2a2a", borderRadius: "6px", padding: "12px 16px", marginTop: "10px", fontSize: "0.85rem", color: "#c5a572" }}>
                Cost per {baseUnit}:{" "}
                {(() => {
                  const CG: Record<string, number> = { g: 1, kg: 1000, lb: 453.592, oz: 28.3495 };
                  const CM: Record<string, number> = { ml: 1, l: 1000, gal: 3785.41, fl_oz: 29.5735 };
                  const conversions = baseUnit === "g" ? CG : CM;
                  const factor = conversions[purchaseUnit];
                  if (!factor) return "N/A \u2014 unit mismatch";
                  const total = parseFloat(purchaseSize) * factor;
                  if (!total) return "\u2014";
                  return `$${(parseFloat(purchaseCost) / total).toFixed(4)}`;
                })()}
              </div>
            )}
            <div className="form-row">
              <label className="form-label">Supplier (optional)</label>
              <input type="text" className="form-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="e.g. Restaurant Depot" />
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={saving || !name.trim() || !purchaseSize || !purchaseCost}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// RECIPE CALCULATOR COMPONENT
// =============================================
function RecipeCalculator({ recipe, pantryItems }: { recipe: PrepRecipe; pantryItems: PantryItem[] }) {
  const [calcMode, setCalcMode] = useState<"bottle" | "ingredient">("bottle");
  const [targetYield, setTargetYield] = useState<number | null>(null);
  const [customYield, setCustomYield] = useState("");
  const [selectedIngIdx, setSelectedIngIdx] = useState(0);
  const [ingredientAmount, setIngredientAmount] = useState("");

  const standardYield = parseYield(recipe.yieldAmount);
  const parsedIngredients = (recipe.ingredients || []).map((ing) => ({
    ...ing,
    parsed: parseAmount(String(ing.amount)),
  }));
  const pantryMap = new Map(pantryItems.map((p) => [p.id, p]));

  let scaleFactor = 1;
  if (calcMode === "bottle") {
    const target = targetYield || (customYield ? parseFloat(customYield) : 0);
    if (target > 0 && standardYield > 0) scaleFactor = target / standardYield;
  } else {
    const amt = parseFloat(ingredientAmount);
    const selected = parsedIngredients[selectedIngIdx];
    if (amt > 0 && selected && selected.parsed.scalable && selected.parsed.value > 0) scaleFactor = amt / selected.parsed.value;
  }

  const hasCalcInput = calcMode === "bottle" ? (targetYield || parseFloat(customYield) > 0) : parseFloat(ingredientAmount) > 0;
  const showCalculator = recipe.type !== "garnish" && standardYield > 0 && parsedIngredients.some((i) => i.parsed.scalable);

  function getIngredientCost(ing: PrepIngredient): number | null {
    if (!ing.pantryItemId) return null;
    const pantry = pantryMap.get(ing.pantryItemId);
    if (!pantry || !pantry.costPerBaseUnit) return null;
    return (parseFloat(String(ing.amount)) || 0) * Number(pantry.costPerBaseUnit);
  }

  return (
    <div>
      {(recipe.batchCost || recipe.costPerOz) && (
        <div style={{ background: "#2a3a2a", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "24px" }}>
          <div>
            <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Batch Cost</span>
            <div style={{ color: "#b5d4aa", fontWeight: "bold" }}>{formatCurrency(recipe.batchCost)}</div>
          </div>
          {recipe.yieldOz && <div>
            <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Yield</span>
            <div style={{ color: "#b5d4aa" }}>{Number(recipe.yieldOz)} oz</div>
          </div>}
          {recipe.costPerOz && <div>
            <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>Cost / oz</span>
            <div style={{ color: "#b5d4aa", fontWeight: "bold" }}>{formatCost4(recipe.costPerOz)}</div>
          </div>}
          {recipe.linkedIngredientId && (
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: "3px", background: "#4a6741", color: "#b5d4aa", textTransform: "uppercase", letterSpacing: "0.08em" }}>SYNCED TO BOTTLES</span>
            </div>
          )}
        </div>
      )}

      {recipe.ingredients && recipe.ingredients.some((i: any) => i.pantryItemId) && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "8px" }}>Ingredient Costs</div>
          {recipe.ingredients.map((ing: any, idx: number) => {
            const cost = getIngredientCost(ing);
            return (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #333", fontSize: "0.85rem" }}>
                <span>{ing.name} {"\u2014"} {ing.amount}{ing.unit || ""}</span>
                <span style={{ color: cost !== null ? "#b5d4aa" : "#666" }}>{cost !== null ? formatCurrency(cost) : "no cost"}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="calc-info-grid">
        {recipe.usedIn && <div className="calc-info-row"><span className="calc-info-label">Used In</span><span className="calc-info-value">{recipe.usedIn}</span></div>}
        {recipe.shelfLife && <div className="calc-info-row"><span className="calc-info-label">Shelf Life</span><span className="calc-info-value">{recipe.shelfLife}</span></div>}
        {recipe.baseRatio && <div className="calc-info-row"><span className="calc-info-label">Ratio</span><span className="calc-info-value">{recipe.baseRatio}</span></div>}
      </div>

      {showCalculator && (
        <div className="calc-section">
          <h4 className="calc-section-title">BATCH CALCULATOR</h4>
          <div className="calc-mode-toggle">
            <button className={`calc-mode-btn ${calcMode === "bottle" ? "active" : ""}`} onClick={() => { setCalcMode("bottle"); setIngredientAmount(""); }}>By Target Yield</button>
            <button className={`calc-mode-btn ${calcMode === "ingredient" ? "active" : ""}`} onClick={() => { setCalcMode("ingredient"); setTargetYield(null); setCustomYield(""); }}>I Have...</button>
          </div>
          {calcMode === "bottle" ? (
            <div className="calc-inputs">
              <div className="calc-label">HOW MUCH DO YOU NEED? (ML)</div>
              <div className="calc-bottle-sizes">
                {BOTTLE_SIZES.map((size) => (
                  <button key={size} className={`calc-size-btn ${targetYield === size ? "active" : ""}`} onClick={() => { setTargetYield(targetYield === size ? null : size); setCustomYield(""); }}>{size}ml</button>
                ))}
              </div>
              <input type="number" className="calc-custom-input" placeholder="Or enter exact amount (ml)" value={customYield} onChange={(e) => { setCustomYield(e.target.value); setTargetYield(null); }} />
            </div>
          ) : (
            <div className="calc-inputs">
              <div className="calc-label">WHAT DO YOU HAVE?</div>
              <select className="calc-select" value={selectedIngIdx} onChange={(e) => setSelectedIngIdx(parseInt(e.target.value))}>
                {parsedIngredients.filter((i) => i.parsed.scalable).map((ing, idx) => (
                  <option key={idx} value={idx}>{ing.name} ({ing.parsed.unit})</option>
                ))}
              </select>
              <input type="number" className="calc-custom-input" placeholder={`Amount in ${parsedIngredients[selectedIngIdx]?.parsed.unit || "units"}`} value={ingredientAmount} onChange={(e) => setIngredientAmount(e.target.value)} />
            </div>
          )}
          {hasCalcInput && scaleFactor !== 1 && (
            <div className="calc-results">
              <div className="calc-results-label">
                {calcMode === "bottle" ? `SCALED TO ${targetYield || customYield}ML (${scaleFactor.toFixed(2)}\u00d7)` : `SCALED (${scaleFactor.toFixed(2)}\u00d7)`}
              </div>
              {parsedIngredients.map((ing, idx) => (
                <div className="calc-result-row" key={idx}>
                  <span className="calc-result-name">{ing.name}</span>
                  <span className="calc-result-value">{ing.parsed.scalable ? formatScaled(ing.parsed.value * scaleFactor, ing.parsed.unit) : ing.parsed.raw}</span>
                </div>
              ))}
              {recipe.yieldAmount && (
                <div className="calc-result-row calc-result-yield">
                  <span className="calc-result-name">Yield</span>
                  <span className="calc-result-value">~{Math.round(standardYield * scaleFactor)}ml</span>
                </div>
              )}
              {recipe.batchCost && (
                <div className="calc-result-row calc-result-yield">
                  <span className="calc-result-name">Batch Cost</span>
                  <span className="calc-result-value" style={{ color: "#b5d4aa" }}>{formatCurrency(Number(recipe.batchCost) * scaleFactor)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {recipe.method && recipe.method.length > 0 && (
        <div className="calc-section">
          <h4 className="calc-section-title">METHOD</h4>
          <ol className="method-steps">{recipe.method.map((step, idx) => (<li key={idx}>{step}</li>))}</ol>
        </div>
      )}
      {recipe.filtration && <div className="calc-info-row"><span className="calc-info-label">Filtration</span><span className="calc-info-value">{recipe.filtration}</span></div>}
      {recipe.storage && <div className="calc-info-row"><span className="calc-info-label">Storage</span><span className="calc-info-value">{recipe.storage}</span></div>}
      {recipe.qualityCheck && <div className="calc-info-row"><span className="calc-info-label">Quality Check</span><span className="calc-info-value">{recipe.qualityCheck}</span></div>}
    </div>
  );
}

// =============================================
// MAIN PAGE
// =============================================
export default function RecipesPage() {
  const params = useParams();
  const venue = params?.venue as string;
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<PrepRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState("all");
  const [showFatCalc, setShowFatCalc] = useState(false);
  const [activeTab, setActiveTab] = useState<"recipes" | "pantry">("recipes");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrepRecipe | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("syrup");
  const [formDescription, setFormDescription] = useState("");
  const [formUsedIn, setFormUsedIn] = useState("");
  const [formBaseRatio, setFormBaseRatio] = useState("");
  const [formYield, setFormYield] = useState("");
  const [formYieldOz, setFormYieldOz] = useState("");
  const [formIngredients, setFormIngredients] = useState<{ name: string; amount: string; unit: string; pantryItemId: string }[]>([]);
  const [formMethod, setFormMethod] = useState("");
  const [formFiltration, setFormFiltration] = useState("");
  const [formStorage, setFormStorage] = useState("");
  const [formShelfLife, setFormShelfLife] = useState("");
  const [formQualityCheck, setFormQualityCheck] = useState("");

  const fetchPantry = useCallback(async () => {
    try { const res = await fetch("/api/pantry-items"); if (res.ok) setPantryItems(await res.json()); } catch (e) { console.error(e); }
  }, []);

  const fetchRecipes = useCallback(async () => {
    if (!venue) return;
    try { const res = await fetch(`/api/prep-recipes?venue=${venue}`); if (res.ok) setRecipes(await res.json()); } catch (e) { console.error(e); }
  }, [venue]);

  useEffect(() => { Promise.all([fetchPantry(), fetchRecipes()]).then(() => setLoading(false)); }, [fetchPantry, fetchRecipes]);

  function openModal(recipe?: PrepRecipe) {
    if (recipe) {
      setEditing(recipe);
      setFormName(recipe.name); setFormType(recipe.type); setFormDescription(recipe.description || "");
      setFormUsedIn(recipe.usedIn || ""); setFormBaseRatio(recipe.baseRatio || "");
      setFormYield(recipe.yieldAmount || ""); setFormYieldOz(recipe.yieldOz ? String(recipe.yieldOz) : "");
      const ings = (recipe.ingredients || []).map((ing: any) => {
        if (ing.pantryItemId) return { name: ing.name, amount: String(ing.amount), unit: ing.unit || "", pantryItemId: ing.pantryItemId };
        const parsed = parseAmount(ing.amount);
        return { name: ing.name, amount: parsed.scalable ? String(parsed.value) : ing.amount, unit: parsed.unit || "", pantryItemId: "" };
      });
      setFormIngredients(ings.length > 0 ? ings : [{ name: "", amount: "", unit: "g", pantryItemId: "" }]);
      setFormMethod(Array.isArray(recipe.method) ? recipe.method.join("\n") : recipe.method || "");
      setFormFiltration(recipe.filtration || ""); setFormStorage(recipe.storage || "");
      setFormShelfLife(recipe.shelfLife || ""); setFormQualityCheck(recipe.qualityCheck || "");
    } else {
      setEditing(null); setFormName(""); setFormType("syrup"); setFormDescription(""); setFormUsedIn("");
      setFormBaseRatio(""); setFormYield(""); setFormYieldOz("");
      setFormIngredients([{ name: "", amount: "", unit: "g", pantryItemId: "" }]);
      setFormMethod(""); setFormFiltration(""); setFormStorage(""); setFormShelfLife(""); setFormQualityCheck("");
    }
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setEditing(null); }
  function addIngredient() { setFormIngredients([...formIngredients, { name: "", amount: "", unit: "g", pantryItemId: "" }]); }
  function removeIngredient(idx: number) { setFormIngredients(formIngredients.filter((_, i) => i !== idx)); }

  function updateIngredient(idx: number, field: string, value: string) {
    const updated = [...formIngredients];
    (updated[idx] as any)[field] = value;
    if (field === "pantryItemId" && value) {
      const pantry = pantryItems.find((p) => p.id === value);
      if (pantry) { updated[idx].name = pantry.name; updated[idx].unit = pantry.baseUnit; }
    }
    setFormIngredients(updated);
  }

  function calcLiveBatchCost(): { total: number; complete: boolean } {
    const pantryMap = new Map(pantryItems.map((p) => [p.id, p]));
    let total = 0; let hasAny = false;
    for (const ing of formIngredients) {
      if (ing.pantryItemId) {
        const pantry = pantryMap.get(ing.pantryItemId);
        if (pantry && pantry.costPerBaseUnit) { total += (parseFloat(ing.amount) || 0) * Number(pantry.costPerBaseUnit); hasAny = true; }
      }
    }
    return { total, complete: hasAny };
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const ingredients = formIngredients.filter((i) => i.name.trim()).map((i) => ({
        name: i.name.trim(), amount: i.amount, unit: i.unit || "", pantryItemId: i.pantryItemId || undefined,
      }));
      const methodLines = formMethod.split("\n").map((s) => s.trim()).filter(Boolean);
      await fetch("/api/prep-recipes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing?.id, venueSlug: venue, name: formName.trim(), type: formType,
          description: formDescription.trim() || null, usedIn: formUsedIn.trim() || null,
          baseRatio: formBaseRatio.trim() || null, yieldAmount: formYield.trim() || null,
          yieldOz: formYieldOz || null, ingredients,
          method: methodLines.length > 0 ? methodLines : null,
          filtration: formFiltration.trim() || null, storage: formStorage.trim() || null,
          shelfLife: formShelfLife.trim() || null, qualityCheck: formQualityCheck.trim() || null,
        }),
      });
      closeModal(); fetchRecipes();
    } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    await fetch("/api/prep-recipes", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    fetchRecipes();
  }

  if (loading) return <div className="empty-state"><p>Loading...</p></div>;

  const filtered = filterType === "all" ? recipes : recipes.filter((r) => r.type === filterType);
  const liveCost = calcLiveBatchCost();
  const liveYieldOz = parseFloat(formYieldOz) || 0;
  const liveCostPerOz = liveCost.total > 0 && liveYieldOz > 0 ? liveCost.total / liveYieldOz : null;

  return (
    <div>
      {/* Tab Bar */}
      <div style={{ display: "flex", gap: "0", marginBottom: "24px", borderBottom: "1px solid #333" }}>
        <button
          onClick={() => setActiveTab("recipes")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "recipes" ? "2px solid #c9a96e" : "2px solid transparent",
            color: activeTab === "recipes" ? "#c9a96e" : "#888",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Prep Recipes
        </button>
        <button
          onClick={() => setActiveTab("pantry")}
          style={{
            padding: "10px 20px",
            background: "none",
            border: "none",
            borderBottom: activeTab === "pantry" ? "2px solid #c9a96e" : "2px solid transparent",
            color: activeTab === "pantry" ? "#c9a96e" : "#888",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Raw Ingredients
        </button>
      </div>

      {/* Pantry Tab */}
      {activeTab === "pantry" && (
        <PantrySection pantryItems={pantryItems} onRefresh={fetchPantry} />
      )}

      {/* Recipes Tab */}
      {activeTab === "recipes" && (
        <>
          <div className="section-header">
            <h2 className="section-title">Prep Recipes</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn-outline" onClick={() => setShowFatCalc(!showFatCalc)}>{showFatCalc ? "Hide" : "Fat Wash"} Calculator</button>
              <button className="btn" onClick={() => openModal()}>+ New Recipe</button>
            </div>
          </div>

          {showFatCalc && <div style={{ marginBottom: "24px" }}><FatWashCalculator /></div>}

          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            <button className={`calc-mode-btn ${filterType === "all" ? "active" : ""}`} onClick={() => setFilterType("all")}>All ({recipes.length})</button>
            {TYPES.map((t) => {
              const count = recipes.filter((r) => r.type === t.value).length;
              if (count === 0) return null;
              return <button key={t.value} className={`calc-mode-btn ${filterType === t.value ? "active" : ""}`} onClick={() => setFilterType(t.value)}>{t.label} ({count})</button>;
            })}
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state"><p>No prep recipes yet.</p><p className="empty-hint">Add your syrups, cordials, fat washes, and more.</p></div>
          ) : (
            <div>
              {filtered.map((recipe) => {
                const isExpanded = expandedId === recipe.id;
                return (
                  <div className="drink-card" key={recipe.id}>
                    <div className="drink-header" onClick={() => setExpandedId(isExpanded ? null : recipe.id)}>
                      <div className="drink-name-section">
                        <span className="drink-name">{recipe.name}</span>
                        <span className={`drink-badge ${typeBadgeClass(recipe.type)}`}>{typeLabel(recipe.type)}</span>
                        {recipe.linkedIngredientId && (
                          <span style={{ fontSize: "0.6rem", padding: "2px 6px", borderRadius: "3px", background: "#4a6741", color: "#b5d4aa", marginLeft: "4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>COSTED</span>
                        )}
                      </div>
                      <div className="drink-stats">
                        {recipe.costPerOz && <div><span className="cogs-label">$/oz</span><span style={{ color: "#b5d4aa" }}>{formatCost4(recipe.costPerOz)}</span></div>}
                        {recipe.batchCost && <div><span className="cogs-label">Batch</span><span>{formatCurrency(recipe.batchCost)}</span></div>}
                        {recipe.shelfLife && <div><span className="cogs-label">Shelf</span><span>{recipe.shelfLife}</span></div>}
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="breakdown">
                        <RecipeCalculator recipe={recipe} pantryItems={pantryItems} />
                        <div className="breakdown-actions"><button className="btn-outline" onClick={() => openModal(recipe)}>Edit</button></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Recipe Modal (shared across tabs) */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{editing ? "Edit Recipe" : "New Prep Recipe"}</h2>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Name</label>
                <input type="text" className="form-input" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Lime Cordial" autoFocus />
              </div>
              <div className="form-row">
                <label className="form-label">Type</label>
                <select className="form-input" value={formType} onChange={(e) => setFormType(e.target.value)}>
                  {TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Description / Purpose</label>
              <input type="text" className="form-input" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Balanced citrus-acid blend for cocktails" />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Used In</label>
                <input type="text" className="form-input" value={formUsedIn} onChange={(e) => setFormUsedIn(e.target.value)} placeholder="Daiquiri, Gimlet" />
              </div>
              <div className="form-row">
                <label className="form-label">Base Ratio</label>
                <input type="text" className="form-input" value={formBaseRatio} onChange={(e) => setFormBaseRatio(e.target.value)} placeholder="1:1 by weight" />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Base Yield (ml, for scaling)</label>
                <input type="text" className="form-input" value={formYield} onChange={(e) => setFormYield(e.target.value)} placeholder="750ml" />
              </div>
              <div className="form-row">
                <label className="form-label">Yield in Oz (for cost/oz calc)</label>
                <input type="number" className="form-input" value={formYieldOz} onChange={(e) => setFormYieldOz(e.target.value)} placeholder="25.36" step="any" />
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <label className="form-label" style={{ margin: 0 }}>Ingredients</label>
                <button className="btn-small" onClick={addIngredient}>+ Add</button>
              </div>
              {formIngredients.map((ing, idx) => (
                <div key={idx} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  {pantryItems.length > 0 ? (
                    <select className="form-input" style={{ flex: 2 }} value={ing.pantryItemId} onChange={(e) => updateIngredient(idx, "pantryItemId", e.target.value)}>
                      <option value="">-- Custom / Free --</option>
                      {pantryItems.map((p) => (<option key={p.id} value={p.id}>{p.name} ({formatCost4(Number(p.costPerBaseUnit))}/{p.baseUnit})</option>))}
                    </select>
                  ) : null}
                  {!ing.pantryItemId && (
                    <input type="text" className="form-input" style={{ flex: 2 }} placeholder="Ingredient name" value={ing.name} onChange={(e) => updateIngredient(idx, "name", e.target.value)} />
                  )}
                  <input type="number" className="form-input" style={{ flex: 1 }} placeholder="Amount" value={ing.amount} onChange={(e) => updateIngredient(idx, "amount", e.target.value)} step="any" />
                  {ing.pantryItemId ? (
  <span style={{ minWidth: "24px", color: "#888", fontSize: "0.85rem" }}>
    {pantryItems.find((p) => p.id === ing.pantryItemId)?.baseUnit || "g"}
  </span>
) : (
  <select className="form-input" style={{ width: "70px", flex: "none" }} value={ing.unit || "g"} onChange={(e) => updateIngredient(idx, "unit", e.target.value)}>
    <option value="g">g</option>
    <option value="ml">ml</option>
    <option value="oz">oz</option>
    <option value="each">each</option>
  </select>
)}
                  {ing.pantryItemId && ing.amount && (() => {
                    const pantry = pantryItems.find((p) => p.id === ing.pantryItemId);
                    if (!pantry?.costPerBaseUnit) return null;
                    const cost = parseFloat(ing.amount) * Number(pantry.costPerBaseUnit);
                    return <span style={{ minWidth: "50px", textAlign: "right", color: "#b5d4aa", fontSize: "0.8rem" }}>{formatCurrency(cost)}</span>;
                  })()}
                  <button className="remove-btn" onClick={() => removeIngredient(idx)}>{"\u00d7"}</button>
                </div>
              ))}
            </div>

            {liveCost.complete && (
              <div style={{ background: "#2a3a2a", borderRadius: "6px", padding: "12px 16px", marginBottom: "16px", display: "flex", gap: "24px" }}>
                <div>
                  <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase" }}>Batch Cost</span>
                  <div style={{ color: "#b5d4aa", fontWeight: "bold" }}>{formatCurrency(liveCost.total)}</div>
                </div>
                {liveCostPerOz !== null && (
                  <div>
                    <span style={{ color: "#888", fontSize: "0.7rem", textTransform: "uppercase" }}>Cost / oz</span>
                    <div style={{ color: "#b5d4aa", fontWeight: "bold" }}>{formatCost4(liveCostPerOz)}</div>
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <label className="form-label">Method (one step per line)</label>
              <textarea className="form-input form-textarea" value={formMethod} onChange={(e) => setFormMethod(e.target.value)} placeholder={"Combine sugar and water in saucepan\nHeat gently until dissolved\nCool and bottle"} rows={6} />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Filtration</label>
                <input type="text" className="form-input" value={formFiltration} onChange={(e) => setFormFiltration(e.target.value)} placeholder="Fine strain through chinois" />
              </div>
              <div className="form-row">
                <label className="form-label">Shelf Life</label>
                <input type="text" className="form-input" value={formShelfLife} onChange={(e) => setFormShelfLife(e.target.value)} placeholder="2-3 weeks refrigerated" />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Storage + Labeling</label>
              <input type="text" className="form-input" value={formStorage} onChange={(e) => setFormStorage(e.target.value)} placeholder="Glass bottle, label with date and name" />
            </div>

            <div className="form-row">
              <label className="form-label">Quality Check</label>
              <input type="text" className="form-input" value={formQualityCheck} onChange={(e) => setFormQualityCheck(e.target.value)} placeholder="Should taste balanced, not too sweet" />
            </div>

            <div className="modal-actions">
              {editing && <button className="btn-danger" onClick={() => { handleDelete(editing.id); closeModal(); }}>Delete</button>}
              <button className="btn-outline" onClick={closeModal}>Cancel</button>
              <button className="btn" onClick={handleSave} disabled={saving || !formName.trim()}>{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
