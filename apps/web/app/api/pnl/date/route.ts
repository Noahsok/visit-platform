import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// DELETE all line items for a specific date
export async function DELETE(
  request: NextRequest,
  { params }: { params: { date: string } }
) {
  const { searchParams } = new URL(request.url);
  const venueSlug = searchParams.get("venue");

  if (!venueSlug) {
    return NextResponse.json({ error: "venue required" }, { status: 400 });
  }

  const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const reportDate = new Date(params.date + "T00:00:00Z");

  await prisma.pnlLineItem.deleteMany({
    where: {
      venueId: venue.id,
      periodStart: reportDate,
      periodEnd: reportDate,
    },
  });

  return NextResponse.json({ success: true });
}
