export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Conversion factors to base units (g or ml)
const CONVERSION_TO_GRAMS: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
};

const CONVERSION_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  gal: 3785.41,
  fl_oz: 29.5735,
  cup: 236.588,
};

function calcCostPerBaseUnit(
  purchaseSize: number,
  purchaseUnit: string,
  purchaseCost: number,
  baseUnit: string
): number | null {
  const conversions = baseUnit === "g" ? CONVERSION_TO_GRAMS : CONVERSION_TO_ML;
  const factor = conversions[purchaseUnit];
  if (!factor) return null;

  const totalBaseUnits = purchaseSize * factor;
  if (totalBaseUnits === 0) return null;
  return purchaseCost / totalBaseUnits;
}

export async function GET() {
  const items = await prisma.pantryItem.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { id, name, purchaseUnit, purchaseSize, purchaseCost, baseUnit, supplier } = body;

  const costPerBaseUnit = calcCostPerBaseUnit(
    Number(purchaseSize),
    purchaseUnit,
    Number(purchaseCost),
    baseUnit
  );

  const data = {
    name,
    purchaseUnit,
    purchaseSize: Number(purchaseSize),
    purchaseCost: Number(purchaseCost),
    baseUnit: baseUnit || "g",
    costPerBaseUnit,
    supplier: supplier || null,
  };

  if (id) {
    const updated = await prisma.pantryItem.update({ where: { id }, data });
    return NextResponse.json(updated);
  }

  const created = await prisma.pantryItem.create({ data });
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  await prisma.pantryItem.update({
    where: { id },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
