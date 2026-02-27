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

  // Calculate batch cost from ingredients with pantryItemId
  let batchCost: number | null = null;
  let costPerOz: number | null = null;

  if (ingredients && Array.isArray(ingredients)) {
    const pantryItemIds = ingredients
      .filter((i: any) => i.pantryItemId)
      .map((i: any) => i.pantryItemId);

    if (pantryItemIds.length > 0) {
      const pantryItems = await prisma.pantryItem.findMany({
        where: { id: { in: pantryItemIds } },
      });
      const pantryMap = new Map(pantryItems.map((p) => [p.id, p]));

      let total = 0;
      let allCosted = true;

      for (const ing of ingredients) {
        if (ing.pantryItemId) {
          const pantry = pantryMap.get(ing.pantryItemId);
          if (pantry && pantry.costPerBaseUnit) {
            const amount = parseFloat(ing.amount) || 0;
            total += amount * Number(pantry.costPerBaseUnit);
          } else {
            allCosted = false;
          }
        }
        // Ingredients without pantryItemId (like water) are free — skip
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
  const { id, dateMade } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const updated = await prisma.prepRecipe.update({
    where: { id },
    data: { dateMade: dateMade ? new Date(dateMade) : null },
  });
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
