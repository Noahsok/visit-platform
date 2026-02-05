import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// GET all recipes with ingredients
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const venueId = searchParams.get("venueId");
  const category = searchParams.get("category");

  const where: any = {};
  if (venueId) where.venueId = venueId;
  if (category) where.category = category as any;

  const recipes = await prisma.recipe.findMany({
    where,
    include: {
      recipeIngredients: {
        include: { ingredient: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(recipes);
}

// POST create or update recipe
export async function POST(request: NextRequest) {
  const body = await request.json();

  const recipeData = {
    name: body.name,
    category: body.category || "cocktail",
    subcategory: body.subcategory || null,
    method: body.method || null,
    glassware: body.glassware || null,
    garnishDescription: body.garnishDescription || null,
    menuPrice: body.menuPrice || body.price || null,
    isMenuActive: body.isMenuActive ?? true,
    venueId: body.venueId || null,
    notes: body.notes || null,
  };

  if (body.id) {
    // Update recipe
    const updated = await prisma.recipe.update({
      where: { id: body.id },
      data: recipeData,
    });

    // Replace ingredients
    if (body.ingredients) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: body.id },
      });
      if (body.ingredients.length > 0) {
        await prisma.recipeIngredient.createMany({
          data: body.ingredients.map((ing: any, idx: number) => ({
            recipeId: body.id,
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit || "oz",
            isOptional: ing.isOptional || false,
            sortOrder: idx,
          })),
        });
      }
    }

    const result = await prisma.recipe.findUnique({
      where: { id: body.id },
      include: {
        recipeIngredients: {
          include: { ingredient: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(result);
  } else {
    // Create recipe
    const created = await prisma.recipe.create({
      data: {
        ...recipeData,
        recipeIngredients: body.ingredients
          ? {
              create: body.ingredients.map((ing: any, idx: number) => ({
                ingredientId: ing.ingredientId,
                amount: ing.amount,
                unit: ing.unit || "oz",
                isOptional: ing.isOptional || false,
                sortOrder: idx,
              })),
            }
          : undefined,
      },
      include: {
        recipeIngredients: {
          include: { ingredient: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(created);
  }
}
