"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";

interface PrepRecipe {
  id: string;
  name: string;
  type: string;
  description: string | null;
  usedIn: string | null;
  baseRatio: string | null;
  yieldAmount: string | null;
  ingredients: { name: string; amount: string }[] | null;
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

// Parse "500g" → { value: 500, unit: "g" }
// Parse "~750ml" → { value: 750, unit: "ml" }
// Parse "1 (halved)" → { value: 1, unit: "(halved)" }
// Parse "Peel of 1.5 lemons (~5-6g)" → { value: 5.5, unit: "g", display: "Peel of 1.5 lemons (~5-6g)" }
function parseAmount(amount: string): {
  value: number;
  unit: string;
  raw: string;
  scalable: boolean;
} {
  const raw = amount.trim();

  // "To 750ml" or "As needed" → not directly scalable
  if (/^(to |as needed)/i.test(raw)) {
    return { value: 0, unit: "", raw, scalable: false };
  }

  // Match number at the start (with optional ~)
  const match = raw.match(/^~?(\d+(?:\.\d+)?)\s*(.*)/);
  if (match) {
    return {
      value: parseFloat(match[1]),
      unit: match[2] || "",
      raw,
      scalable: true,
    };
  }

  // Try to find any number in the string
  const numMatch = raw.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    return {
      value: parseFloat(numMatch[1]),
      unit: raw.replace(numMatch[0], "").trim(),
      raw,
      scalable: true,
    };
  }

  return { value: 0, unit: "", raw, scalable: false };
}

// Parse yield string to numeric ml value
function parseYield(yieldStr: string | null): number {
  if (!yieldStr) return 0;
  const match = yieldStr.match(/~?(\d+)/);
  return match ? parseInt(match[1]) : 0;
}

// Format a scaled amount nicely
function formatScaled(value: number, unit: string): string {
  if (value === 0) return "—";
  // Round to 1 decimal, strip trailing .0
  const rounded = Math.round(value * 10) / 10;
  const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1);
  return unit ? `${str}${unit}` : str;
}

const BOTTLE_SIZES = [375, 500, 750, 1000, 1500];

// =============================================
// RECIPE CALCULATOR COMPONENT
// =============================================
function RecipeCalculator({
  recipe,
}: {
  recipe: PrepRecipe;
}) {
  const [calcMode, setCalcMode] = useState<"bottle" | "ingredient">("bottle");
  const [targetYield, setTargetYield] = useState<number | null>(null);
  const [customYield, setCustomYield] = useState("");
  const [selectedIngIdx, setSelectedIngIdx] = useState(0);
  const [ingredientAmount, setIngredientAmount] = useState("");

  const standardYield = parseYield(recipe.yieldAmount);
  const parsedIngredients = (recipe.ingredients || []).map((ing) => ({
    ...ing,
    parsed: parseAmount(ing.amount),
  }));

  // Calculate scale factor
  let scaleFactor = 1;
  if (calcMode === "bottle") {
    const target = targetYield || (customYield ? parseFloat(customYield) : 0);
    if (target > 0 && standardYield > 0) {
      scaleFactor = target / standardYield;
    }
  } else {
    // By ingredient mode
    const amt = parseFloat(ingredientAmount);
    const selected = parsedIngredients[selectedIngIdx];
    if (amt > 0 && selected && selected.parsed.scalable && selected.parsed.value > 0) {
      scaleFactor = amt / selected.parsed.value;
    }
  }

  const hasCalcInput =
    calcMode === "bottle"
      ? (targetYield || parseFloat(customYield) > 0)
      : parseFloat(ingredientAmount) > 0;

  // Don't show calculator for garnishes or items without numeric yields
  const showCalculator =
    recipe.type !== "garnish" &&
    standardYield > 0 &&
    parsedIngredients.some((i) => i.parsed.scalable);

  return (
    <div>
      {/* Header info */}
      <div className="calc-info-grid">
        {recipe.usedIn && (
          <div className="calc-info-row">
            <span className="calc-info-label">Used In</span>
            <span className="calc-info-value">{recipe.usedIn}</span>
          </div>
        )}
        {recipe.yieldAmount && (
          <div className="calc-info-row">
            <span className="calc-info-label">Standard Batch</span>
            <span className="calc-info-value">{recipe.yieldAmount} yield</span>
          </div>
        )}
        {recipe.shelfLife && (
          <div className="calc-info-row">
            <span className="calc-info-label">Shelf Life</span>
            <span className="calc-info-value">{recipe.shelfLife}</span>
          </div>
        )}
        {recipe.baseRatio && (
          <div className="calc-info-row">
            <span className="calc-info-label">Formula</span>
            <span className="calc-info-value">{recipe.baseRatio}</span>
          </div>
        )}
      </div>

      {/* Calculator */}
      {showCalculator && (
        <div className="calc-section">
          <h4 className="calc-section-title">CALCULATOR</h4>

          {/* Mode toggle */}
          <div className="calc-mode-toggle">
            <button
              className={`calc-mode-btn ${calcMode === "bottle" ? "active" : ""}`}
              onClick={() => {
                setCalcMode("bottle");
                setIngredientAmount("");
              }}
            >
              By Bottle Size
            </button>
            <button
              className={`calc-mode-btn ${calcMode === "ingredient" ? "active" : ""}`}
              onClick={() => {
                setCalcMode("ingredient");
                setTargetYield(null);
                setCustomYield("");
              }}
            >
              By Ingredient
            </button>
          </div>

          {calcMode === "bottle" ? (
            <div className="calc-inputs">
              <div className="calc-label">TARGET YIELD (ML)</div>
              <div className="calc-bottle-sizes">
                {BOTTLE_SIZES.map((size) => (
                  <button
                    key={size}
                    className={`calc-size-btn ${targetYield === size ? "active" : ""}`}
                    onClick={() => {
                      setTargetYield(targetYield === size ? null : size);
                      setCustomYield("");
                    }}
                  >
                    {size}ml
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="calc-custom-input"
                placeholder="Or enter custom amount"
                value={customYield}
                onChange={(e) => {
                  setCustomYield(e.target.value);
                  setTargetYield(null);
                }}
              />
            </div>
          ) : (
            <div className="calc-inputs">
              <div className="calc-label">I HAVE THIS MUCH OF...</div>
              <select
                className="calc-select"
                value={selectedIngIdx}
                onChange={(e) => setSelectedIngIdx(parseInt(e.target.value))}
              >
                {parsedIngredients
                  .filter((i) => i.parsed.scalable)
                  .map((ing, idx) => {
                    // Find original index
                    const origIdx = parsedIngredients.findIndex(
                      (p) => p.name === ing.name
                    );
                    return (
                      <option key={origIdx} value={origIdx}>
                        {ing.name} (standard: {ing.amount})
                      </option>
                    );
                  })}
              </select>
              <input
                type="number"
                className="calc-custom-input"
                placeholder={`Enter amount in ${parsedIngredients[selectedIngIdx]?.parsed.unit || "units"}`}
                value={ingredientAmount}
                onChange={(e) => setIngredientAmount(e.target.value)}
              />
            </div>
          )}

          {/* Scaled ingredients */}
          {hasCalcInput && scaleFactor !== 1 && (
            <div className="calc-results">
              <div className="calc-results-header">
                <span>
                  {calcMode === "bottle"
                    ? `${targetYield || customYield}ml batch`
                    : `${(scaleFactor * 100).toFixed(0)}% of standard`}
                </span>
                <span className="calc-scale-factor">
                  {scaleFactor.toFixed(2)}× scale
                </span>
              </div>
              {parsedIngredients.map((ing, i) => (
                <div key={i} className="calc-result-row">
                  <span>{ing.name}</span>
                  <span className="calc-result-amount">
                    {ing.parsed.scalable
                      ? formatScaled(
                          ing.parsed.value * scaleFactor,
                          ing.parsed.unit
                        )
                      : ing.parsed.raw}
                  </span>
                </div>
              ))}
              {standardYield > 0 && (
                <div className="calc-result-row calc-result-yield">
                  <span>Expected yield</span>
                  <span className="calc-result-amount">
                    ~{Math.round(standardYield * scaleFactor)}ml
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Standard ingredients (when no calculator or for garnishes) */}
      {(!showCalculator || !hasCalcInput || scaleFactor === 1) &&
        recipe.ingredients &&
        recipe.ingredients.length > 0 && (
          <div className="calc-section">
            <h4 className="calc-section-title">
              {recipe.type === "garnish" ? "BUILD" : "STANDARD BATCH"}
            </h4>
            <div className="calc-results">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="calc-result-row">
                  <span>{ing.name}</span>
                  <span className="calc-result-amount">{ing.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Production Method */}
      {recipe.method && recipe.method.length > 0 && (
        <div className="calc-section">
          <h4 className="calc-section-title">PRODUCTION METHOD</h4>
          <ol className="prep-method-steps">
            {recipe.method.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Filtration */}
      {recipe.filtration && (
        <div className="calc-section">
          <h4 className="calc-section-title">FILTRATION</h4>
          <p className="calc-detail-text">{recipe.filtration}</p>
        </div>
      )}

      {/* Storage */}
      {recipe.storage && (
        <div className="calc-section">
          <h4 className="calc-section-title">STORAGE + LABELING</h4>
          <p className="calc-detail-text">{recipe.storage}</p>
        </div>
      )}

      {/* Quality Check */}
      {recipe.qualityCheck && (
        <div className="calc-section">
          <h4 className="calc-section-title">QUALITY CHECK</h4>
          <p className="calc-detail-text">{recipe.qualityCheck}</p>
        </div>
      )}
    </div>
  );
}

// =============================================
// MAIN PAGE
// =============================================
export default function RecipesPage() {
  const params = useParams();
  const venue = params.venue as string;

  const [recipes, setRecipes] = useState<PrepRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PrepRecipe | null>(null);
  const [filterType, setFilterType] = useState("all");

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("syrup");
  const [formDescription, setFormDescription] = useState("");
  const [formUsedIn, setFormUsedIn] = useState("");
  const [formBaseRatio, setFormBaseRatio] = useState("");
  const [formYield, setFormYield] = useState("");
  const [formIngredients, setFormIngredients] = useState<
    { name: string; amount: string }[]
  >([]);
  const [formMethod, setFormMethod] = useState("");
  const [formFiltration, setFormFiltration] = useState("");
  const [formStorage, setFormStorage] = useState("");
  const [formShelfLife, setFormShelfLife] = useState("");
  const [formQualityCheck, setFormQualityCheck] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchRecipes = useCallback(async () => {
    const res = await fetch(`/api/prep-recipes?venue=${venue}`);
    const data = await res.json();
    setRecipes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [venue]);

  useEffect(() => {
    fetchRecipes();
  }, [fetchRecipes]);

  function openModal(recipe?: PrepRecipe) {
    if (recipe) {
      setEditing(recipe);
      setFormName(recipe.name);
      setFormType(recipe.type);
      setFormDescription(recipe.description || "");
      setFormUsedIn(recipe.usedIn || "");
      setFormBaseRatio(recipe.baseRatio || "");
      setFormYield(recipe.yieldAmount || "");
      setFormIngredients(recipe.ingredients || []);
      setFormMethod((recipe.method || []).join("\n"));
      setFormFiltration(recipe.filtration || "");
      setFormStorage(recipe.storage || "");
      setFormShelfLife(recipe.shelfLife || "");
      setFormQualityCheck(recipe.qualityCheck || "");
    } else {
      setEditing(null);
      setFormName("");
      setFormType("syrup");
      setFormDescription("");
      setFormUsedIn("");
      setFormBaseRatio("");
      setFormYield("");
      setFormIngredients([]);
      setFormMethod("");
      setFormFiltration("");
      setFormStorage("");
      setFormShelfLife("");
      setFormQualityCheck("");
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function addIngredient() {
    setFormIngredients([...formIngredients, { name: "", amount: "" }]);
  }

  function updateIngredient(idx: number, field: string, value: string) {
    const updated = [...formIngredients];
    (updated[idx] as any)[field] = value;
    setFormIngredients(updated);
  }

  function removeIngredient(idx: number) {
    setFormIngredients(formIngredients.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);

    const methodArr = formMethod
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const body: any = {
      venueSlug: venue,
      name: formName.trim(),
      type: formType,
      description: formDescription.trim() || null,
      usedIn: formUsedIn.trim() || null,
      baseRatio: formBaseRatio.trim() || null,
      yieldAmount: formYield.trim() || null,
      ingredients: formIngredients.length > 0 ? formIngredients : null,
      method: methodArr.length > 0 ? methodArr : null,
      filtration: formFiltration.trim() || null,
      storage: formStorage.trim() || null,
      shelfLife: formShelfLife.trim() || null,
      qualityCheck: formQualityCheck.trim() || null,
    };

    if (editing) body.id = editing.id;

    await fetch("/api/prep-recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeModal();
    setSaving(false);
    fetchRecipes();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this recipe?")) return;
    await fetch(`/api/prep-recipes/${id}`, { method: "DELETE" });
    setExpandedId(null);
    fetchRecipes();
  }

  const filtered =
    filterType === "all"
      ? recipes
      : recipes.filter((r) => r.type === filterType);

  const usedTypes = [...new Set(recipes.map((r) => r.type))];

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Prep Recipes</h2>
        <button className="btn" onClick={() => openModal()}>
          + New Recipe
        </button>
      </div>

      {/* Type filter */}
      {recipes.length > 0 && (
        <div className="prep-filter">
          <button
            className={`prep-filter-btn ${filterType === "all" ? "active" : ""}`}
            onClick={() => setFilterType("all")}
          >
            All
          </button>
          {usedTypes.map((t) => (
            <button
              key={t}
              className={`prep-filter-btn ${filterType === t ? "active" : ""}`}
              onClick={() => setFilterType(t)}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="empty-state">
          <p>No prep recipes yet.</p>
          <p className="empty-hint">
            Add your first syrup, cordial, or fat wash recipe.
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((recipe) => {
            const isExpanded = expandedId === recipe.id;

            return (
              <div key={recipe.id} className="drink-card">
                <div
                  className="drink-header"
                  onClick={() =>
                    setExpandedId(isExpanded ? null : recipe.id)
                  }
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="drink-name">{recipe.name}</span>
                    <span
                      className={`prep-badge ${typeBadgeClass(recipe.type)}`}
                    >
                      {typeLabel(recipe.type)}
                    </span>
                  </div>
                  <div className="drink-stats">
                    {recipe.shelfLife && (
                      <div>
                        <span className="cogs-label">Shelf</span>
                        <span>{recipe.shelfLife}</span>
                      </div>
                    )}
                    {recipe.yieldAmount && (
                      <div>
                        <span className="margin-label">Yield</span>
                        <span>{recipe.yieldAmount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="breakdown">
                    <RecipeCalculator recipe={recipe} />

                    <div className="breakdown-actions">
                      <button
                        className="btn-outline"
                        onClick={() => openModal(recipe)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-danger"
                        onClick={() => handleDelete(recipe.id)}
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

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal modal-large"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">
              {editing ? "Edit Recipe" : "New Prep Recipe"}
            </h2>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Lime Cordial"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label className="form-label">Type</label>
                <select
                  className="form-input"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Description / Purpose</label>
              <input
                type="text"
                className="form-input"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Balanced citrus-acid blend for cocktails"
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Used In</label>
                <input
                  type="text"
                  className="form-input"
                  value={formUsedIn}
                  onChange={(e) => setFormUsedIn(e.target.value)}
                  placeholder="Daiquiri, Gimlet"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Base Ratio</label>
                <input
                  type="text"
                  className="form-input"
                  value={formBaseRatio}
                  onChange={(e) => setFormBaseRatio(e.target.value)}
                  placeholder="1:1 by weight"
                />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">
                Standard Batch Yield (e.g. 750ml)
              </label>
              <input
                type="text"
                className="form-input"
                value={formYield}
                onChange={(e) => setFormYield(e.target.value)}
                placeholder="750ml"
              />
            </div>

            {/* Ingredients */}
            <div className="form-section">
              <div className="form-section-header">
                <label className="form-label" style={{ margin: 0 }}>
                  Ingredients (include unit e.g. 500g, 375ml)
                </label>
                <button className="btn-small" onClick={addIngredient}>
                  + Add
                </button>
              </div>
              {formIngredients.map((ing, idx) => (
                <div className="ingredient-row" key={idx}>
                  <input
                    type="text"
                    placeholder="Ingredient name"
                    value={ing.name}
                    onChange={(e) =>
                      updateIngredient(idx, "name", e.target.value)
                    }
                  />
                  <input
                    type="text"
                    placeholder="Amount (e.g. 500g)"
                    value={ing.amount}
                    onChange={(e) =>
                      updateIngredient(idx, "amount", e.target.value)
                    }
                  />
                  <button
                    className="remove-btn"
                    onClick={() => removeIngredient(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Method */}
            <div className="form-row">
              <label className="form-label">Method (one step per line)</label>
              <textarea
                className="form-input form-textarea"
                value={formMethod}
                onChange={(e) => setFormMethod(e.target.value)}
                placeholder={
                  "Combine sugar and water in saucepan\nHeat gently until dissolved\nCool and bottle"
                }
                rows={6}
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Filtration</label>
                <input
                  type="text"
                  className="form-input"
                  value={formFiltration}
                  onChange={(e) => setFormFiltration(e.target.value)}
                  placeholder="Fine strain through chinois"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Shelf Life</label>
                <input
                  type="text"
                  className="form-input"
                  value={formShelfLife}
                  onChange={(e) => setFormShelfLife(e.target.value)}
                  placeholder="2-3 weeks refrigerated"
                />
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Storage + Labeling</label>
              <input
                type="text"
                className="form-input"
                value={formStorage}
                onChange={(e) => setFormStorage(e.target.value)}
                placeholder="Glass bottle, label with date and name"
              />
            </div>

            <div className="form-row">
              <label className="form-label">Quality Check</label>
              <input
                type="text"
                className="form-input"
                value={formQualityCheck}
                onChange={(e) => setFormQualityCheck(e.target.value)}
                placeholder="Should taste balanced, not too sweet"
              />
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleSave}
                disabled={saving || !formName.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
