import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.recipe.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: {
      recipeIngredients: {
        include: { ingredient: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });
  if (!recipe) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(recipe);
}
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const recipe = await prisma.recipe.update({
    where: { id: params.id },
    data: {
      ...(body.glassware !== undefined && { glassware: body.glassware }),
      ...(body.method !== undefined && { method: body.method }),
      ...(body.garnishDescription !== undefined && { garnishDescription: body.garnishDescription }),
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.isMenuActive !== undefined && { isMenuActive: body.isMenuActive }),
    },
  });
  return NextResponse.json(recipe);
}