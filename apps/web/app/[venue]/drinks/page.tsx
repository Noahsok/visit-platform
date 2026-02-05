"use client";

import { useState, useEffect, useCallback } from "react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  costPerUnit: number | null;
  bottleSizeOz: number | null;
  bottleCost: number | null;
}

interface RecipeIngredient {
  id?: string;
  ingredientId: string;
  ingredient: Ingredient;
  amount: number;
  unit: string;
}

interface Recipe {
  id: string;
  name: string;
  category: string;
  method: string | null;
  glassware: string | null;
  garnishDescription: string | null;
  menuPrice: number | null;
  isMenuActive: boolean;
  notes: string | null;
  recipeIngredients: RecipeIngredient[];
}

function getIngCostPerOz(ing: Ingredient): number {
  if (ing.costPerUnit) return Number(ing.costPerUnit);
  if (ing.bottleSizeOz && ing.bottleCost) {
    return Number(ing.bottleCost) / Number(ing.bottleSizeOz);
  }
  return 0;
}

function calcRecipeCost(recipe: Recipe): number {
  return recipe.recipeIngredients.reduce((sum, ri) => {
    const unitCost = getIngCostPerOz(ri.ingredient);
    return sum + unitCost * Number(ri.amount);
  }, 0);
}

function calcMargin(price: number, cost: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

export default function DrinksPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);

  // Form state
  const [drinkName, setDrinkName] = useState("");
  const [drinkPrice, setDrinkPrice] = useState("");
  const [method, setMethod] = useState("");
  const [glassware, setGlassware] = useState("");
  const [garnishDesc, setGarnishDesc] = useState("");
  const [currentIngredients, setCurrentIngredients] = useState<
    { ingredientId: string; amount: string; unit: string }[]
  >([]);

  const fetchData = useCallback(async () => {
    const [recipesRes, ingredientsRes] = await Promise.all([
      fetch("/api/recipes"),
      fetch("/api/ingredients"),
    ]);
    setRecipes(await recipesRes.json());
    setIngredients(await ingredientsRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openModal(recipe?: Recipe) {
    if (recipe) {
      setEditing(recipe);
      setDrinkName(recipe.name);
      setDrinkPrice(recipe.menuPrice ? Number(recipe.menuPrice).toString() : "");
      setMethod(recipe.method || "");
      setGlassware(recipe.glassware || "");
      setGarnishDesc(recipe.garnishDescription || "");
      setCurrentIngredients(
        recipe.recipeIngredients.map((ri) => ({
          ingredientId: ri.ingredientId,
          amount: Number(ri.amount).toString(),
          unit: ri.unit,
        }))
      );
    } else {
      setEditing(null);
      setDrinkName("");
      setDrinkPrice("");
      setMethod("");
      setGlassware("");
      setGarnishDesc("");
      setCurrentIngredients([]);
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function addIngredient() {
    const firstIng = ingredients.filter((i) => i.category !== "garnish")[0];
    if (!firstIng) return;
    setCurrentIngredients([
      ...currentIngredients,
      { ingredientId: firstIng.id, amount: "1", unit: "oz" },
    ]);
  }

  function addGarnish() {
    const firstGarnish = ingredients.filter((i) => i.category === "garnish")[0];
    if (!firstGarnish) return;
    setCurrentIngredients([
      ...currentIngredients,
      { ingredientId: firstGarnish.id, amount: "1", unit: "piece" },
    ]);
  }

  function updateIngredient(idx: number, field: string, value: string) {
    const updated = [...currentIngredients];
    (updated[idx] as any)[field] = value;
    setCurrentIngredients(updated);
  }

  function removeIngredient(idx: number) {
    setCurrentIngredients(currentIngredients.filter((_, i) => i !== idx));
  }

  // Preview cost in modal
  function previewCost(): number {
    return currentIngredients.reduce((sum, ci) => {
      const ing = ingredients.find((i) => i.id === ci.ingredientId);
      if (!ing) return sum;
      const unitCost = getIngCostPerOz(ing);
      return sum + unitCost * (parseFloat(ci.amount) || 0);
    }, 0);
  }

  async function handleSave() {
    const body: any = {
      name: drinkName,
      menuPrice: parseFloat(drinkPrice) || null,
      category: "cocktail",
      method: method || null,
      glassware: glassware || null,
      garnishDescription: garnishDesc || null,
      ingredients: currentIngredients.map((ci) => ({
        ingredientId: ci.ingredientId,
        amount: parseFloat(ci.amount) || 0,
        unit: ci.unit,
      })),
    };

    if (editing) body.id = editing.id;

    await fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeModal();
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this drink?")) return;
    await fetch(`/api/recipes/${id}`, { method: "DELETE" });
    fetchData();
  }

  function toggleExpand(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  const cost = previewCost();
  const priceNum = parseFloat(drinkPrice) || 0;
  const previewMargin = calcMargin(priceNum, cost);

  if (loading) {
    return <div className="empty-state"><p>Loading...</p></div>;
  }

  const spirits = ingredients.filter((i) => i.category !== "garnish");
  const garnishes = ingredients.filter((i) => i.category === "garnish");

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">All Drinks</h2>
        <button className="btn" onClick={() => openModal()}>
          + New Drink
        </button>
      </div>

      {recipes.length === 0 ? (
        <div className="empty-state">
          <p>No drinks yet.</p>
          <p className="empty-hint">
            Add bottles first, then build your drink specs.
          </p>
        </div>
      ) : (
        <div>
          {recipes.map((recipe) => {
            const recipeCost = calcRecipeCost(recipe);
            const recipePrice = Number(recipe.menuPrice) || 0;
            const margin = calcMargin(recipePrice, recipeCost);
            const cogsPercent = recipePrice > 0 ? (recipeCost / recipePrice) * 100 : 0;
            const isExpanded = expandedId === recipe.id;

            return (
              <div key={recipe.id} className="drink-card">
                <div className="drink-header" onClick={() => toggleExpand(recipe.id)}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span className="drink-name">{recipe.name}</span>
                    <span className="drink-price">
                      {recipePrice > 0 ? "$" + recipePrice : ""}
                    </span>
                  </div>
                  <div className="drink-stats">
                    <div>
                      <span className="cogs-label">COGS</span>
                      <span>{cogsPercent.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="margin-label">Margin</span>
                      <span>{margin.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="breakdown">
                    {recipe.method && (
                      <div style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
                        {recipe.method}
                        {recipe.glassware ? " · " + recipe.glassware : ""}
                        {recipe.garnishDescription ? " · " + recipe.garnishDescription : ""}
                      </div>
                    )}
                    <table className="breakdown-table">
                      <thead>
                        <tr>
                          <th>Ingredient</th>
                          <th>Amount</th>
                          <th>$/oz</th>
                          <th>Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipe.recipeIngredients.map((ri) => {
                          const unitCost = getIngCostPerOz(ri.ingredient);
                          const ingCost = unitCost * Number(ri.amount);
                          return (
                            <tr key={ri.id || ri.ingredientId}>
                              <td>{ri.ingredient.name}</td>
                              <td>
                                {Number(ri.amount)} {ri.unit}
                              </td>
                              <td>
                                {ri.unit !== "piece"
                                  ? "$" + unitCost.toFixed(2)
                                  : "\u2014"}
                              </td>
                              <td>${ingCost.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3}>Total COGS</td>
                          <td>${recipeCost.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <div className="breakdown-actions">
                      <button className="btn-outline" onClick={() => openModal(recipe)}>
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

      {/* Drink Builder Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editing ? "Edit Drink" : "New Drink"}
            </h2>

            <div className="form-row">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={drinkName}
                onChange={(e) => setDrinkName(e.target.value)}
                placeholder="e.g. Paper Plane"
                autoFocus
              />
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Price ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={drinkPrice}
                  onChange={(e) => setDrinkPrice(e.target.value)}
                  step="0.01"
                  placeholder="16.00"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Method</label>
                <input
                  type="text"
                  className="form-input"
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder="Stir, Shake, Build"
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-row">
                <label className="form-label">Glassware</label>
                <input
                  type="text"
                  className="form-input"
                  value={glassware}
                  onChange={(e) => setGlassware(e.target.value)}
                  placeholder="Coupe, Rocks, Nick & Nora"
                />
              </div>
              <div className="form-row">
                <label className="form-label">Garnish</label>
                <input
                  type="text"
                  className="form-input"
                  value={garnishDesc}
                  onChange={(e) => setGarnishDesc(e.target.value)}
                  placeholder="Expressed orange peel"
                />
              </div>
            </div>

            {/* Ingredients */}
            <div style={{ marginTop: 16 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label className="form-label" style={{ margin: 0 }}>
                  Ingredients
                </label>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn-small" onClick={addIngredient}>
                    + Spirit
                  </button>
                  <button className="btn-small" onClick={addGarnish}>
                    + Garnish
                  </button>
                </div>
              </div>

              {currentIngredients.map((ci, idx) => {
                const isGarnish =
                  ingredients.find((i) => i.id === ci.ingredientId)?.category ===
                  "garnish";
                const options = isGarnish ? garnishes : spirits;

                return (
                  <div className="ingredient-row" key={idx}>
                    <select
                      value={ci.ingredientId}
                      onChange={(e) =>
                        updateIngredient(idx, "ingredientId", e.target.value)
                      }
                    >
                      {options.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.25"
                      value={ci.amount}
                      onChange={(e) =>
                        updateIngredient(idx, "amount", e.target.value)
                      }
                    />
                    <span className="unit">{isGarnish ? "qty" : "oz"}</span>
                    <button
                      className="remove-btn"
                      onClick={() => removeIngredient(idx)}
                    >
                      \u00d7
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="cost-preview">
              <div className="cost-row">
                <span>COGS</span>
                <span>${cost.toFixed(2)}</span>
              </div>
              <div className="cost-row">
                <span>Margin</span>
                <span>{previewMargin.toFixed(1)}%</span>
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn-outline" onClick={closeModal}>
                Cancel
              </button>
              <button className="btn" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
