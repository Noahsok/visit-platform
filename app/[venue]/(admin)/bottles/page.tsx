"use client";

import { useState, useEffect, useCallback } from "react";

interface Ingredient {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  bottleSizeOz: number | null;
  bottleCost: number | null;
  costPerUnit: number | null;
  unitOfMeasure: string;
  isHouseMade: boolean;
  caseCost: number | null;
  caseCount: number | null;
  juiceYieldOz: number | null;
}

function mlToOz(ml: number) {
  return ml / 29.57;
}

function ozToMl(oz: number) {
  return oz * 29.57;
}

export default function BottlesPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Form state
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("spirit");
  const [sizeMl, setSizeMl] = useState("");
  const [price, setPrice] = useState("");
  // Juice-specific form state
  const [caseCost, setCaseCost] = useState("");
  const [caseCount, setCaseCount] = useState("");
  const [juiceYieldOz, setJuiceYieldOz] = useState("");

  const fetchIngredients = useCallback(async () => {
    const res = await fetch("/api/ingredients");
    const data = await res.json();
    setIngredients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  function openModal(ing?: Ingredient) {
    if (ing) {
      setEditing(ing);
      setName(ing.name);
      setType(ing.subcategory || "");
      setCategory(ing.category);
      // For fats, bottleSizeOz is already stored as ml; for others, convert from oz to ml
      const sizeForDisplay = ing.bottleSizeOz 
        ? ing.category === "fat" 
          ? Math.round(Number(ing.bottleSizeOz)).toString()
          : Math.round(ozToMl(Number(ing.bottleSizeOz))).toString()
        : "";
      setSizeMl(sizeForDisplay);
      setPrice(ing.bottleCost ? Number(ing.bottleCost).toString() : "");
      setCaseCost(ing.caseCost ? Number(ing.caseCost).toString() : "");
      setCaseCount(ing.caseCount ? Number(ing.caseCount).toString() : "");
      setJuiceYieldOz(ing.juiceYieldOz ? Number(ing.juiceYieldOz).toString() : "");
    } else {
      setEditing(null);
      setName("");
      setType("");
      setCategory("spirit");
      setSizeMl("");
      setPrice("");
      setCaseCost("");
      setCaseCount("");
      setJuiceYieldOz("");
    }
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  async function handleSave() {
    const isJuice = category === "juice" || (!!caseCost && !!caseCount && !!juiceYieldOz);
    const isFat = category === "fat";

    const body: any = {
      name,
      category,
      subcategory: type || null,
      unitOfMeasure: isFat ? "ml" : "oz",
    };

    if (isJuice && caseCost && caseCount && juiceYieldOz) {
      // Juice: case → fruit → oz chain — API calculates costPerUnit
      body.caseCost = parseFloat(caseCost);
      body.caseCount = parseFloat(caseCount);
      body.juiceYieldOz = parseFloat(juiceYieldOz);
      // Also allow optional bottle override (sizeMl/price)
      if (sizeMl && price) {
        body.bottleSizeOz = mlToOz(parseFloat(sizeMl));
        body.bottleCost = parseFloat(price);
      }
    } else {
      const sizeNum = parseFloat(sizeMl) || 0;
      const priceNum = parseFloat(price) || 0;
      const sizeValue = sizeNum > 0 ? (isFat ? sizeNum : mlToOz(sizeNum)) : null;
      const costPerUnit = sizeValue && priceNum > 0 ? priceNum / sizeValue : null;
      body.bottleSizeOz = sizeValue;
      body.bottleCost = priceNum || null;
      body.costPerUnit = costPerUnit;
    }

    if (editing) body.id = editing.id;

    await fetch("/api/ingredients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    closeModal();
    fetchIngredients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this bottle?")) return;
    await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
    fetchIngredients();
  }

  // Calculate $/oz (or $/ml for fats) for display
  function getCostPerUnit(ing: Ingredient): string {
    if (ing.category === "fat") {
      // Fats use $/ml
      if (ing.costPerUnit) return "$" + Number(ing.costPerUnit).toFixed(3) + "/ml";
      if (ing.bottleSizeOz && ing.bottleCost) {
        // For fats, bottleSizeOz actually stores ml directly
        return "$" + (Number(ing.bottleCost) / Number(ing.bottleSizeOz)).toFixed(3) + "/ml";
      }
      return "—";
    }
    // Everything else uses $/oz
    if (ing.costPerUnit) return "$" + Number(ing.costPerUnit).toFixed(2);
    if (ing.bottleSizeOz && ing.bottleCost) {
      return "$" + (Number(ing.bottleCost) / Number(ing.bottleSizeOz)).toFixed(2);
    }
    return "—";
  }

  function isJuiceItem(ing: Ingredient): boolean {
    return !!(ing.caseCost && ing.caseCount && ing.juiceYieldOz);
  }

  function getSize(ing: Ingredient): string {
    if (isJuiceItem(ing)) {
      return `${Number(ing.caseCount)} fruits`;
    }
    if (!ing.bottleSizeOz) return "—";
    if (ing.category === "fat") {
      return Math.round(Number(ing.bottleSizeOz)) + "ml";
    }
    return Math.round(ozToMl(Number(ing.bottleSizeOz))) + "ml";
  }

  function getPrice(ing: Ingredient): string {
    if (isJuiceItem(ing)) {
      return "$" + Number(ing.caseCost).toFixed(2) + "/case";
    }
    return ing.bottleCost ? "$" + Number(ing.bottleCost).toFixed(2) : "—";
  }

  // Preview cost per unit in modal
  const juiceCaseNum = parseFloat(caseCost) || 0;
  const juiceCountNum = parseFloat(caseCount) || 0;
  const juiceYieldNum = parseFloat(juiceYieldOz) || 0;
  const juiceTotalOz = juiceCountNum * juiceYieldNum;
  const juiceCostPerFruit = juiceCountNum > 0 ? juiceCaseNum / juiceCountNum : 0;
  const juiceCostPerOz = juiceTotalOz > 0 ? juiceCaseNum / juiceTotalOz : 0;

  const showJuiceFields = category === "juice" || (!!editing?.caseCost && !!editing?.caseCount && !!editing?.juiceYieldOz);
  const previewCpo =
    showJuiceFields && juiceCaseNum > 0 && juiceTotalOz > 0
      ? juiceCostPerOz
      : parseFloat(sizeMl) > 0 && parseFloat(price) > 0
        ? category === "fat"
          ? parseFloat(price) / parseFloat(sizeMl)
          : parseFloat(price) / mlToOz(parseFloat(sizeMl))
        : 0;

  // Separate bottles from garnishes
  const allBottles = ingredients.filter((i) => i.category !== "garnish");
  const garnishes = ingredients.filter((i) => i.category === "garnish");

  // Get unique categories for filter dropdown
  const categories = [...new Set(allBottles.map((b) => b.category))].sort();
  const subcategories = [...new Set(allBottles.map((b) => b.subcategory).filter(Boolean))].sort();

  // Apply filters
  const bottles = allBottles.filter((b) => {
    const matchesSearch =
      searchQuery === "" ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.subcategory || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      filterCategory === "all" ||
      b.category === filterCategory ||
      b.subcategory === filterCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return <div className="empty-state"><p>Loading...</p></div>;
  }

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Bottles</h2>
        <button className="btn" onClick={() => openModal()}>
          + New Bottle
        </button>
      </div>

      {/* Filters */}
      <div style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
      }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search bottles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ flex: 1, maxWidth: 280 }}
        />
        <select
          className="form-select"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ width: "auto", minWidth: 140 }}
        >
          <option value="all">All Types ({allBottles.length})</option>
          <optgroup label="Category">
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({allBottles.filter((b) => b.category === cat).length})
              </option>
            ))}
          </optgroup>
          {subcategories.length > 0 && (
            <optgroup label="Subcategory">
              {subcategories.map((sub) => (
                <option key={sub} value={sub}>
                  {sub} ({allBottles.filter((b) => b.subcategory === sub).length})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {bottles.length === 0 && allBottles.length > 0 ? (
        <div className="empty-state">
          <p>No bottles match your filter.</p>
          <button className="btn-outline" onClick={() => { setSearchQuery(""); setFilterCategory("all"); }}>
            Clear filters
          </button>
        </div>
      ) : bottles.length === 0 ? (
        <div className="empty-state">
          <p>No bottles yet.</p>
          <p className="empty-hint">Add your first bottle to start building drink specs.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Size</th>
              <th>Price</th>
              <th>$/unit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {bottles.map((b) => (
              <tr key={b.id}>
                <td>{b.name}</td>
                <td className="muted">{b.subcategory || b.category}</td>
                <td>{getSize(b)}</td>
                <td>{getPrice(b)}</td>
                <td className="bold">{getCostPerUnit(b)}</td>
                <td>
                  <button className="btn-small" onClick={() => openModal(b)}>
                    Edit
                  </button>
                  <button
                    className="btn-small-danger"
                    onClick={() => handleDelete(b.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Garnishes section */}
      <div style={{ marginTop: 32 }}>
        <div className="section-header">
          <h2 className="section-title">Garnishes</h2>
          <button
            className="btn"
            onClick={() => {
              setCategory("garnish");
              openModal();
            }}
          >
            + New Garnish
          </button>
        </div>

        {garnishes.length === 0 ? (
          <div className="empty-state">
            <p>No garnishes yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cost per piece</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {garnishes.map((g) => (
                <tr key={g.id}>
                  <td>{g.name}</td>
                  <td className="bold">
                    {g.costPerUnit ? "$" + Number(g.costPerUnit).toFixed(2) : "—"}
                  </td>
                  <td>
                    <button className="btn-small" onClick={() => openModal(g)}>
                      Edit
                    </button>
                    <button
                      className="btn-small-danger"
                      onClick={() => handleDelete(g.id)}
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">
              {editing ? "Edit" : "New"}{" "}
              {category === "garnish" ? "Garnish" : "Bottle"}
            </h2>

            <div className="form-row">
              <label className="form-label">Name</label>
              <input
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={category === "garnish" ? "e.g. Expressed Orange Peel" : "e.g. Rittenhouse Rye"}
                autoFocus
              />
            </div>

            {category !== "garnish" && (
              <>
                <div className="form-row">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="spirit">Spirit</option>
                    <option value="modifier">Modifier</option>
                    <option value="syrup">Syrup</option>
                    <option value="bitter">Bitter</option>
                    <option value="juice">Juice</option>
                    <option value="dairy">Dairy</option>
                    <option value="beer">Beer</option>
                    <option value="wine">Wine</option>
                    <option value="soda">Soda</option>
                    <option value="fat">Fat</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-row">
                  <label className="form-label">Type</label>
                  <input
                    type="text"
                    className="form-input"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    placeholder="e.g. Rye Whiskey, Amaro, etc."
                  />
                </div>

                {(category === "juice" || (editing && editing.caseCost && editing.caseCount && editing.juiceYieldOz)) ? (
                  <>
                    <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: "8px", marginTop: "4px" }}>
                      Case → Fruit → Juice Yield
                    </div>
                    <div className="form-grid">
                      <div className="form-row">
                        <label className="form-label">Case Cost ($)</label>
                        <input type="number" className="form-input" value={caseCost} onChange={(e) => setCaseCost(e.target.value)} step="0.01" placeholder="30.00" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Fruits per Case</label>
                        <input type="number" className="form-input" value={caseCount} onChange={(e) => setCaseCount(e.target.value)} placeholder="200" />
                      </div>
                    </div>
                    <div className="form-row">
                      <label className="form-label">Juice Yield per Fruit (oz)</label>
                      <input type="number" className="form-input" value={juiceYieldOz} onChange={(e) => setJuiceYieldOz(e.target.value)} step="0.01" placeholder="1.0" />
                    </div>

                    {juiceCaseNum > 0 && juiceCountNum > 0 && juiceYieldNum > 0 && (
                      <div style={{ background: "#2a3a2a", borderRadius: "6px", padding: "12px 16px", marginTop: "10px", fontSize: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "#888" }}>Cost per fruit</span>
                          <span style={{ color: "#c5a572" }}>${juiceCostPerFruit.toFixed(3)}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                          <span style={{ color: "#888" }}>Total yield</span>
                          <span style={{ color: "#c5a572" }}>{juiceTotalOz.toFixed(1)} oz</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                          <span style={{ color: "#888" }}>$/oz</span>
                          <span style={{ color: "#b5d4aa" }}>${juiceCostPerOz.toFixed(4)}</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="form-grid">
                      <div className="form-row">
                        <label className="form-label">Size (ml)</label>
                        <input type="number" className="form-input" value={sizeMl} onChange={(e) => setSizeMl(e.target.value)} placeholder="750" />
                      </div>
                      <div className="form-row">
                        <label className="form-label">Price ($)</label>
                        <input type="number" className="form-input" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" placeholder="32.00" />
                      </div>
                    </div>

                    <div className="cost-preview">
                      <div className="cost-row">
                        <span>{category === "fat" ? "$/ml" : "$/oz"}</span>
                        <span>${category === "fat" ? previewCpo.toFixed(3) : previewCpo.toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {category === "garnish" && (
              <div className="form-row">
                <label className="form-label">Cost per piece ($)</label>
                <input
                  type="number"
                  className="form-input"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  step="0.01"
                  placeholder="0.25"
                />
              </div>
            )}

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
