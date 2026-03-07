export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const venue = req.nextUrl.searchParams.get("venue");
    if (!venue) return NextResponse.json({ error: "venue required" }, { status: 400 });

    const venueRecord = await prisma.venue.findUnique({ where: { slug: venue } });

    const prepRecipes = await prisma.prepRecipe.findMany({
      where: {
        OR: [
          { venueId: venueRecord?.id },
          { venueId: null },
        ],
        isActive: true,
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(prepRecipes);
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 5),
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    id,
    venueSlug,
    name,
    type,
    description,
    usedIn,
    baseRatio,
    yieldAmount,
    ingredients,
    scalingTable,
    method,
    filtration,
    storage,
    shelfLife,
    qualityCheck,
    sortOrder,
    yieldOz,
    dateMade,
  } = body;

  let venueId: string | null = null;
  if (venueSlug) {
    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
    venueId = venue?.id || null;
  }

  // Unit conversion for cost calculation (e.g., 500ml lime juice → oz for bottle cost)
  function convertForCost(amount: number, recipeUnit: string, costUnit: string): number {
    const ru = recipeUnit.toLowerCase();
    const cu = costUnit.toLowerCase();
    if (ru === cu) return amount;
    if ((ru === "ml" || ru === "g") && cu === "oz") return amount / 29.57;
    if (ru === "oz" && (cu === "ml" || cu === "g")) return amount * 29.57;
    return amount;
  }

  // Calculate batch cost from ingredients with pantryItemId or ingredientId
  let batchCost: number | null = null;
  let costPerOz: number | null = null;

  if (ingredients && Array.isArray(ingredients)) {
    const pantryItemIds = ingredients.filter((i: any) => i.pantryItemId).map((i: any) => i.pantryItemId);
    const ingredientIds = ingredients.filter((i: any) => i.ingredientId).map((i: any) => i.ingredientId);

    const hasCostSources = pantryItemIds.length > 0 || ingredientIds.length > 0;

    if (hasCostSources) {
      const pantryItems = pantryItemIds.length > 0
        ? await prisma.pantryItem.findMany({ where: { id: { in: pantryItemIds } } })
        : [];
      const bottleItems = ingredientIds.length > 0
        ? await prisma.ingredient.findMany({ where: { id: { in: ingredientIds } } })
        : [];

      const pantryMap = new Map(pantryItems.map((p) => [p.id, p]));
      const bottleMap = new Map(bottleItems.map((b) => [b.id, b]));

      let total = 0;
      let allCosted = true;

      for (const ing of ingredients) {
        const rawAmount = parseFloat(ing.amount) || 0;
        const recipeUnit = (ing.unit || "").toLowerCase();
        if (ing.pantryItemId) {
          const pantry = pantryMap.get(ing.pantryItemId);
          if (pantry && pantry.costPerBaseUnit) {
            const converted = convertForCost(rawAmount, recipeUnit, pantry.baseUnit || "g");
            total += converted * Number(pantry.costPerBaseUnit);
          } else {
            allCosted = false;
          }
        } else if (ing.ingredientId) {
          const bottle = bottleMap.get(ing.ingredientId);
          if (bottle && bottle.costPerUnit) {
            const converted = convertForCost(rawAmount, recipeUnit, bottle.unitOfMeasure || "oz");
            total += converted * Number(bottle.costPerUnit);
          } else {
            allCosted = false;
          }
        }
        // Ingredients without either ID (like water) are free — skip
      }

      if (allCosted || total > 0) {
        batchCost = Math.round(total * 100) / 100;
      }
    }
  }

  const numericYieldOz = yieldOz ? parseFloat(yieldOz) : null;
  if (batchCost !== null && numericYieldOz && numericYieldOz > 0) {
    costPerOz = Math.round((batchCost / numericYieldOz) * 10000) / 10000;
  }

  const data: any = {
    name,
    type: type || "other",
    description: description || null,
    usedIn: usedIn || null,
    baseRatio: baseRatio || null,
    yieldAmount: yieldAmount || null,
    ingredients: ingredients || null,
    scalingTable: scalingTable || null,
    method: method || null,
    filtration: filtration || null,
    storage: storage || null,
    shelfLife: shelfLife || null,
    qualityCheck: qualityCheck || null,
    sortOrder: sortOrder ?? 0,
    venueId,
    yieldOz: numericYieldOz,
    batchCost,
    costPerOz,
    dateMade: dateMade ? new Date(dateMade) : undefined,
  };

  let prepRecipe;
  if (id) {
    prepRecipe = await prisma.prepRecipe.update({ where: { id }, data });
  } else {
    prepRecipe = await prisma.prepRecipe.create({ data });
  }

  // Sync to ingredients table as house-made ingredient
  if (costPerOz !== null && numericYieldOz) {
    const bottleSizeOz = numericYieldOz;
    const bottleCost = batchCost;

    // Determine category
    const categoryMap: Record<string, string> = {
      syrup: "syrup",
      cordial: "modifier",
      oleo: "modifier",
      infusion: "spirit",
      fat_wash: "spirit",
      garnish: "garnish",
      other: "other",
    };
    const category = categoryMap[type || "other"] || "other";

    if (prepRecipe.linkedIngredientId) {
      // Update existing ingredient
      await prisma.ingredient.update({
        where: { id: prepRecipe.linkedIngredientId },
        data: {
          name,
          category: category as any,
          isHouseMade: true,
          unitOfMeasure: "oz",
          bottleSizeOz,
          bottleCost,
          costPerUnit: costPerOz,
          notes: shelfLife ? `Shelf life: ${shelfLife}` : null,
        },
      });
    } else {
      // Create new ingredient and link back
      const ingredient = await prisma.ingredient.create({
        data: {
          name,
          category: category as any,
          isHouseMade: true,
          unitOfMeasure: "oz",
          bottleSizeOz,
          bottleCost,
          costPerUnit: costPerOz,
          notes: shelfLife ? `Shelf life: ${shelfLife}` : null,
        },
      });
      await prisma.prepRecipe.update({
        where: { id: prepRecipe.id },
        data: { linkedIngredientId: ingredient.id },
      });
    }
  }

  return NextResponse.json(prepRecipe);
}

export async function PATCH(req: NextRequest) {
  const { id, dateMade, batchStatus } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const data: any = {};
  if (dateMade !== undefined) data.dateMade = dateMade ? new Date(dateMade) : null;
  if (batchStatus !== undefined) data.batchStatus = batchStatus;

  const updated = await prisma.prepRecipe.update({
    where: { id },
    data,
  });

  // If 86'd, update linked bottle note to show unavailable
  if (batchStatus === "86d" && updated.linkedIngredientId) {
    const recipe = await prisma.prepRecipe.findUnique({ where: { id } });
    await prisma.ingredient.update({
      where: { id: updated.linkedIngredientId },
      data: { notes: `86'd — ${recipe?.shelfLife ? `Shelf life: ${recipe.shelfLife}` : "needs new batch"}` },
    });
  } else if (batchStatus === "active" && updated.linkedIngredientId) {
    const recipe = await prisma.prepRecipe.findUnique({ where: { id } });
    await prisma.ingredient.update({
      where: { id: updated.linkedIngredientId },
      data: { notes: recipe?.shelfLife ? `Shelf life: ${recipe.shelfLife}` : null },
    });
  }

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.prepRecipe.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
