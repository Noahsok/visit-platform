#!/usr/bin/env node

/**
 * Migration script: Old Visit P&L → New Visit Platform
 * 
 * Pulls bottles, garnishes, and drinks from the old Railway app
 * and inserts them into the new Postgres database via local API.
 * 
 * Usage:
 *   1. Make sure the new app is running: cd apps/web && npx next dev
 *   2. Run this script: node scripts/migrate-from-railway.mjs
 */

const OLD_APP = "https://web-production-684d2.up.railway.app";
const NEW_APP = "http://localhost:3000";
const ADMIN_PIN = "1234";

async function main() {
  console.log("🔑 Authenticating with old app...");

  // Auth with old app to get session cookie
  const authRes = await fetch(`${OLD_APP}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin: ADMIN_PIN }),
  });
  const authData = await authRes.json();
  if (!authData.success) {
    console.error("❌ Auth failed:", authData);
    process.exit(1);
  }

  // Grab the session cookie
  const cookies = authRes.headers.getSetCookie?.() || [];
  const cookieHeader = cookies.join("; ");
  console.log("✅ Authenticated as", authData.role);

  // Fetch all data from old app
  console.log("\n📦 Fetching data from old app...");
  const dataRes = await fetch(`${OLD_APP}/api/data`, {
    headers: { Cookie: cookieHeader },
  });
  const data = await dataRes.json();

  console.log(`   Bottles: ${data.bottles?.length || 0}`);
  console.log(`   Garnishes: ${data.garnishes?.length || 0}`);
  console.log(`   Drinks: ${data.drinks?.length || 0}`);
  console.log(`   Staff: ${data.staff?.length || 0}`);
  console.log(`   Menu items: ${data.nightlyMenu?.length || 0}`);

  if (!data.bottles?.length && !data.garnishes?.length && !data.drinks?.length) {
    console.log("⚠️  No data found. Is the old app running?");
    process.exit(1);
  }

  // Map old IDs to new IDs
  const bottleIdMap = {};  // old int ID → new UUID
  const garnishIdMap = {};

  // ============================================
  // MIGRATE BOTTLES
  // ============================================
  console.log("\n🍾 Migrating bottles...");
  for (const bottle of data.bottles || []) {
    const body = {
      name: bottle.name,
      category: guessCategory(bottle.type),
      subcategory: bottle.type || null,
      unitOfMeasure: "oz",
      bottleSizeOz: bottle.sizeMl ? bottle.sizeMl / 29.57 : null,
      bottleCost: bottle.price || null,
    };

    // Auto-calc costPerUnit
    if (body.bottleSizeOz && body.bottleCost) {
      body.costPerUnit = body.bottleCost / body.bottleSizeOz;
    }

    try {
      const res = await fetch(`${NEW_APP}/api/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      bottleIdMap[bottle.id] = created.id;
      console.log(`   ✅ ${bottle.name} (${bottle.type}) → ${created.id}`);
    } catch (err) {
      console.error(`   ❌ ${bottle.name}: ${err.message}`);
    }
  }

  // ============================================
  // MIGRATE GARNISHES
  // ============================================
  console.log("\n🍋 Migrating garnishes...");
  for (const garnish of data.garnishes || []) {
    const body = {
      name: garnish.name,
      category: "garnish",
      unitOfMeasure: "piece",
      costPerUnit: garnish.costPer || null,
    };

    try {
      const res = await fetch(`${NEW_APP}/api/ingredients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      garnishIdMap[garnish.id] = created.id;
      console.log(`   ✅ ${garnish.name} ($${garnish.costPer}) → ${created.id}`);
    } catch (err) {
      console.error(`   ❌ ${garnish.name}: ${err.message}`);
    }
  }

  // ============================================
  // MIGRATE DRINKS (RECIPES)
  // ============================================
  console.log("\n🍸 Migrating drinks...");
  let skippedIngredients = 0;

  for (const drink of data.drinks || []) {
    // Map old ingredient references to new IDs
    const ingredients = [];
    for (const ing of drink.ingredients || []) {
      if (ing.type === "bottle") {
        const newId = bottleIdMap[ing.bottleId];
        if (newId) {
          ingredients.push({
            ingredientId: newId,
            amount: ing.oz || 0,
            unit: "oz",
          });
        } else {
          console.log(`   ⚠️  ${drink.name}: bottle ID ${ing.bottleId} not found, skipping ingredient`);
          skippedIngredients++;
        }
      } else if (ing.type === "garnish") {
        const newId = garnishIdMap[ing.garnishId];
        if (newId) {
          ingredients.push({
            ingredientId: newId,
            amount: ing.qty || 1,
            unit: "piece",
          });
        } else {
          console.log(`   ⚠️  ${drink.name}: garnish ID ${ing.garnishId} not found, skipping ingredient`);
          skippedIngredients++;
        }
      }
    }

    const body = {
      name: drink.name,
      category: "cocktail",
      menuPrice: drink.price || null,
      isMenuActive: (data.nightlyMenu || []).includes(drink.id),
      ingredients,
    };

    try {
      const res = await fetch(`${NEW_APP}/api/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const created = await res.json();
      console.log(`   ✅ ${drink.name} ($${drink.price}) — ${ingredients.length} ingredients → ${created.id}`);
    } catch (err) {
      console.error(`   ❌ ${drink.name}: ${err.message}`);
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log("\n" + "=".repeat(50));
  console.log("✅ Migration complete!");
  console.log(`   Bottles: ${Object.keys(bottleIdMap).length}`);
  console.log(`   Garnishes: ${Object.keys(garnishIdMap).length}`);
  console.log(`   Drinks: ${(data.drinks || []).length}`);
  if (skippedIngredients > 0) {
    console.log(`   ⚠️  ${skippedIngredients} ingredient references skipped (unmapped IDs)`);
  }
  console.log("\nRefresh localhost:3000 to see your data!");
}

/**
 * Guess ingredient category from the old app's "type" field
 */
function guessCategory(type) {
  if (!type) return "other";
  const t = type.toLowerCase();

  if (t.includes("gin") || t.includes("vodka") || t.includes("whiskey") || 
      t.includes("bourbon") || t.includes("rye") || t.includes("rum") || 
      t.includes("tequila") || t.includes("mezcal") || t.includes("brandy") ||
      t.includes("scotch")) return "spirit";
  if (t.includes("amaro") || t.includes("vermouth") || t.includes("liqueur") ||
      t.includes("aperitif") || t.includes("batch")) return "modifier";
  if (t.includes("bitter")) return "bitter";
  if (t.includes("syrup")) return "syrup";
  if (t.includes("juice") || t.includes("citrus")) return "juice";
  if (t.includes("beer") || t.includes("wine") || t.includes("seltzer") ||
      t.includes("soda") || t.includes("water") || t.includes("mixer")) return "other";
  if (t.includes("cordial")) return "syrup";
  if (t.includes("liquor")) return "spirit";

  return "other";
}

main().catch(console.error);
