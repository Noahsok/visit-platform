export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@visit/db";

export async function GET(req: NextRequest) {
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
  } = body;

  let venueId: string | null = null;
  if (venueSlug) {
    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
    venueId = venue?.id || null;
  }

  const data = {
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
  };

  if (id) {
    const updated = await prisma.prepRecipe.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.prepRecipe.create({ data });
  return NextResponse.json(created);
}
