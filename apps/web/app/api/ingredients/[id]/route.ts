export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.ingredient.update({
    where: { id: params.id },
    data: { isActive: false },
  });
  return NextResponse.json({ success: true });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: params.id },
  });
  if (!ingredient) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(ingredient);
}
