export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// POST /api/checkins/checkout — mark a member as checked out
export async function POST(request: NextRequest) {
  const { checkinId } = await request.json();

  if (!checkinId) {
    return NextResponse.json(
      { error: "checkinId required" },
      { status: 400 }
    );
  }

  const checkIn = await prisma.checkIn.update({
    where: { id: checkinId },
    data: { checkedOutAt: new Date() },
  });

  return NextResponse.json({ success: true, checkIn });
}
