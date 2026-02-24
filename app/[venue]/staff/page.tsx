"use client";

import { useState, useEffect, useCallback } from "react";

/* ── Types ── */
interface Ingredient {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
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
  isMenuActive: boolean;
  menuPrice: number | null;
  notes: string | null;
  recipeIngredients: RecipeIngredient[];
}

/* ── Styles ── */
const s = {
  container: { maxWidth: 600, margin: "0 auto" } as React.CSSProperties,
  loading: { textAlign: "center" as const, padding: "60px 20px", color: "var(--text-secondary, #888)" },

  // Sub-tabs
  subTabs: {
    display: "flex", borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
  } as React.CSSProperties,
  subTab: {
    flex: 1, padding: "12px 16px", fontSize: 13, fontWeight: 500,
    background: "none", border: "none", borderBottom: "2px solid transparent",
    color: "var(--text-secondary, #888)", cursor: "pointer",
    textAlign: "center" as const, transition: "all 0.15s",
  } as React.CSSProperties,
  subTabActive: {
    flex: 1, padding: "12px 16px", fontSize: 13, fontWeight: 500,
    background: "none", border: "none",
    borderBottom: "2px solid var(--text-primary, #fff)",
    color: "var(--text-primary, #fff)", cursor: "pointer",
    textAlign: "center" as const, transition: "all 0.15s",
  } as React.CSSProperties,

  // Toolbar
  toolbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 16px", borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
  } as React.CSSProperties,
  count: { fontSize: 13, color: "var(--text-secondary, #888)" } as React.CSSProperties,
  searchToggle: {
    background: "none", border: "none", fontSize: 18, padding: 6,
    cursor: "pointer", opacity: 0.6,
  } as React.CSSProperties,

  // Search
  searchBar: {
    display: "flex", alignItems: "center", padding: "8px 16px", gap: 8,
    borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
  } as React.CSSProperties,
  searchInput: {
    flex: 1, padding: "10px 0", border: "none", background: "transparent",
    color: "var(--text-primary, #fff)", fontSize: 15, outline: "none",
    fontFamily: "inherit",
  } as React.CSSProperties,
  searchClose: {
    background: "none", border: "none", fontSize: 22,
    color: "var(--text-secondary, #666)", cursor: "pointer", padding: "4px 8px",
  } as React.CSSProperties,

  // Drink Card
  card: {
    padding: "20px 16px", cursor: "pointer",
    borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.06))",
    transition: "background 0.15s",
  } as React.CSSProperties,
  cardTop: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 6,
  } as React.CSSProperties,
  cardName: { fontSize: 17, fontWeight: 500, color: "var(--text-primary, #fff)" } as React.CSSProperties,
  glassBadge: {
    fontSize: 10, fontWeight: 600, padding: "4px 10px",
    background: "rgba(255,255,255,0.95)", color: "#1a1a1a", borderRadius: 4,
    letterSpacing: 0.5, boxShadow: "0 0 12px rgba(255,255,255,0.15)",
    whiteSpace: "nowrap" as const, flexShrink: 0, marginLeft: 12,
  } as React.CSSProperties,
  cardIngredients: {
    fontSize: 14, color: "var(--text-secondary, #888)", lineHeight: 1.4,
  } as React.CSSProperties,

  // Menu toggle button on card
  menuToggle: {
    background: "none", border: "1px solid var(--border-color, rgba(255,255,255,0.15))",
    borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 500,
    color: "var(--text-secondary, #888)", cursor: "pointer",
    marginTop: 8, transition: "all 0.15s",
  } as React.CSSProperties,
  menuToggleActive: {
    background: "rgba(76, 175, 80, 0.15)", border: "1px solid rgba(76, 175, 80, 0.3)",
    borderRadius: 4, padding: "4px 10px", fontSize: 11, fontWeight: 500,
    color: "#81c784", cursor: "pointer",
    marginTop: 8, transition: "all 0.15s",
  } as React.CSSProperties,

  // Detail Modal
  overlay: {
    position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center",
    alignItems: "flex-start", padding: 20, overflowY: "auto" as const, zIndex: 200,
  } as React.CSSProperties,
  detailCard: {
    background: "var(--card-bg, #2a2a2a)", padding: 32, maxWidth: 700,
    width: "100%", margin: "40px 0", boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    position: "relative" as const, borderRadius: 2,
  } as React.CSSProperties,
  closeBtn: {
    position: "absolute" as const, top: 16, right: 16,
    background: "rgba(255,255,255,0.08)", border: "none", width: 36, height: 36,
    borderRadius: "50%", cursor: "pointer", fontSize: 20,
    color: "var(--text-secondary, #888)", display: "flex",
    alignItems: "center", justifyContent: "center",
  } as React.CSSProperties,
  detailTitle: {
    fontSize: 28, fontWeight: 700, marginBottom: 8, paddingRight: 40,
    color: "var(--text-primary, #fff)",
  } as React.CSSProperties,
  detailSubtitle: {
    color: "var(--text-secondary, #888)", marginBottom: 24, fontSize: 14,
    letterSpacing: 0.5,
  } as React.CSSProperties,
  section: { marginBottom: 24 } as React.CSSProperties,
  sectionTitle: {
    fontSize: 12, fontWeight: 600, color: "var(--text-secondary, #888)",
    textTransform: "uppercase" as const, letterSpacing: 0.5, marginBottom: 12,
  } as React.CSSProperties,
  ingredientList: { listStyle: "none", margin: 0, padding: 0 } as React.CSSProperties,
  ingredientItem: {
    padding: "10px 0", borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.1))",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  } as React.CSSProperties,
  ingredientItemLast: {
    padding: "10px 0", display: "flex", justifyContent: "space-between",
    alignItems: "center",
  } as React.CSSProperties,
  ingredientName: { fontWeight: 500, color: "var(--text-primary, #fff)" } as React.CSSProperties,
  ingredientAmount: { fontWeight: 600, color: "var(--text-primary, #fff)" } as React.CSSProperties,
  detailText: { lineHeight: 1.7, color: "var(--text-primary, #e8e8e8)" } as React.CSSProperties,
  empty: { padding: "40px 16px", textAlign: "center" as const, color: "var(--text-secondary, #888)" },
};

/* ── Main Component ── */
export default function DrinkBiblePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpec, setSelectedSpec] = useState<Recipe | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [tab, setTab] = useState<"menu" | "all">("menu");

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/recipes");
    const data = await res.json();
    setRecipes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedSpec(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toggleMenu = async (recipe: Recipe) => {
    const newStatus = !recipe.isMenuActive;
    // Optimistic update
    setRecipes((prev) =>
      prev.map((r) => (r.id === recipe.id ? { ...r, isMenuActive: newStatus } : r))
    );
    await fetch(`/api/recipes/${recipe.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isMenuActive: newStatus }),
    });
  };

  const filtered = recipes.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.recipeIngredients.some((ri) =>
        ri.ingredient.name.toLowerCase().includes(q)
      )
    );
  });

  const menuDrinks = filtered.filter((r) => r.isMenuActive);
  const allDrinks = filtered;
  const displayDrinks = tab === "menu" ? menuDrinks : allDrinks;

  if (loading) {
    return <div style={s.loading}><p>Loading specs…</p></div>;
  }

  return (
    <div style={s.container}>
      {/* Sub-tabs */}
      <div style={s.subTabs}>
        <button
          style={tab === "menu" ? s.subTabActive : s.subTab}
          onClick={() => setTab("menu")}
        >
          Menu ({menuDrinks.length})
        </button>
        <button
          style={tab === "all" ? s.subTabActive : s.subTab}
          onClick={() => setTab("all")}
        >
          All Drinks ({allDrinks.length})
        </button>
      </div>

      {/* Toolbar / Search */}
      {showSearch ? (
        <div style={s.searchBar}>
          <input
            type="text"
            placeholder="Search drinks or ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={s.searchInput}
          />
          <button
            style={s.searchClose}
            onClick={() => { setSearch(""); setShowSearch(false); }}
          >
            ×
          </button>
        </div>
      ) : (
        <div style={s.toolbar}>
          <span style={s.count}>
            {tab === "menu"
              ? `${menuDrinks.length} drinks on menu`
              : `${allDrinks.length} drinks total`}
          </span>
          <button style={s.searchToggle} onClick={() => setShowSearch(true)}>
            🔍
          </button>
        </div>
      )}

      {/* Drink List */}
      {displayDrinks.length === 0 ? (
        <div style={s.empty}>
          {tab === "menu" ? "No drinks on the menu yet." : "No drinks match your search."}
        </div>
      ) : (
        displayDrinks.map((recipe) => (
          <DrinkCard
            key={recipe.id}
            recipe={recipe}
            showMenuToggle={tab === "all"}
            onToggleMenu={() => toggleMenu(recipe)}
            onClick={() => setSelectedSpec(recipe)}
          />
        ))
      )}

      {/* Detail Modal */}
      {selectedSpec && (
        <SpecDetail spec={selectedSpec} onClose={() => setSelectedSpec(null)} />
      )}
    </div>
  );
}

/* ── Drink Card ── */
function DrinkCard({
  recipe,
  showMenuToggle,
  onToggleMenu,
  onClick,
}: {
  recipe: Recipe;
  showMenuToggle: boolean;
  onToggleMenu: () => void;
  onClick: () => void;
}) {
  return (
    <div style={s.card} onClick={onClick}>
      <div style={s.cardTop}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <div style={s.cardName}>{recipe.name}</div>
          {recipe.menuPrice != null && (
            <span style={{ fontSize: 14, color: "var(--accent, #c9a96e)", fontWeight: 500 }}>
              ${Number(recipe.menuPrice)}
            </span>
          )}
        </div>
        {recipe.glassware && (
          <span style={s.glassBadge}>{recipe.glassware.toUpperCase()}</span>
        )}
      </div>
      <div style={s.cardIngredients}>
        {recipe.recipeIngredients.map((ri) => ri.ingredient.name).join(", ")}
      </div>
      {showMenuToggle && (
        <button
          style={recipe.isMenuActive ? s.menuToggleActive : s.menuToggle}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu();
          }}
        >
          {recipe.isMenuActive ? "✓ On Menu" : "+ Add to Menu"}
        </button>
      )}
    </div>
  );
}

/* ── Spec Detail Modal ── */
function SpecDetail({ spec, onClose }: { spec: Recipe; onClose: () => void }) {
  const subtitle = [spec.method, spec.glassware].filter(Boolean).join(" · ");
  const ingredients = spec.recipeIngredients;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.detailCard} onClick={(e) => e.stopPropagation()}>
        <button style={s.closeBtn} onClick={onClose}>×</button>

        <h2 style={s.detailTitle}>{spec.name}</h2>
        <div style={s.detailSubtitle}>
          {spec.menuPrice != null && (
            <span style={{ color: "var(--accent, #c9a96e)", marginRight: 12 }}>
              ${Number(spec.menuPrice)}
            </span>
          )}
          {subtitle && subtitle.toUpperCase()}
        </div>

        {/* Ingredients */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Ingredients</div>
          <ul style={s.ingredientList}>
            {ingredients.map((ri, i) => (
              <li
                key={ri.id || ri.ingredientId}
                style={i < ingredients.length - 1 ? s.ingredientItem : s.ingredientItemLast}
              >
                <span style={s.ingredientName}>{ri.ingredient.name}</span>
                <span style={s.ingredientAmount}>
                  {Number(ri.amount)} {ri.unit}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Glassware */}
        {spec.glassware && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Glassware</div>
            <p style={s.detailText}>{spec.glassware}</p>
          </div>
        )}

        {/* Garnish */}
        {spec.garnishDescription && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Garnish</div>
            <p style={s.detailText}>{spec.garnishDescription}</p>
          </div>
        )}

        {/* Method */}
        {spec.method && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Method</div>
            <p style={s.detailText}>{spec.method}</p>
          </div>
        )}

        {/* Notes */}
        {spec.notes && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Notes</div>
            <p style={s.detailText}>{spec.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
