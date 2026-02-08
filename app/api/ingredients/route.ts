export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all ingredients (optionally filter by category)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where = category ? { category: category as any, isActive: true } : { isActive: true };

  const ingredients = await prisma.ingredient.findMany({
    where,
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(ingredients);
}

// POST create or update ingredient
export async function POST(request: NextRequest) {
  const body = await request.json();

  const data = {
    name: body.name,
    category: body.category || "spirit",
    subcategory: body.subcategory || body.type || null,
    isHouseMade: body.isHouseMade || false,
    unitOfMeasure: body.unitOfMeasure || "oz",
    bottleSizeOz: body.bottleSizeOz || (body.sizeMl ? body.sizeMl / 29.57 : null),
    bottleCost: body.bottleCost || body.price || null,
    costPerUnit: body.costPerUnit || null,
    supplier: body.supplier || null,
    notes: body.notes || null,
  };

  // Auto-calculate costPerUnit if bottle info is provided
  if (data.bottleSizeOz && data.bottleCost && !data.costPerUnit) {
    data.costPerUnit = Number(data.bottleCost) / Number(data.bottleSizeOz);
  }

  if (body.id) {
    const updated = await prisma.ingredient.update({
      where: { id: body.id },
      data,
    });
    return NextResponse.json(updated);
  } else {
    const created = await prisma.ingredient.create({ data });
    return NextResponse.json(created);
  }
}
