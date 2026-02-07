export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/renewals — create a renewal request
export async function POST(request: NextRequest) {
  const { memberId, venueId } = await request.json();

  if (!memberId || !venueId) {
    return NextResponse.json(
      { error: "memberId and venueId required" },
      { status: 400 }
    );
  }

  // Check if already has unprocessed request
  const existing = await prisma.renewalRequest.findFirst({
    where: { memberId, venueId, isProcessed: false },
  });

  if (existing) {
    return NextResponse.json({ success: true, message: "Already requested" });
  }

  const renewal = await prisma.renewalRequest.create({
    data: { memberId, venueId },
    include: { member: true },
  });

  return NextResponse.json({ success: true, renewal });
}

// GET /api/renewals?venueId=xxx — get unprocessed renewal requests
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  const requests = await prisma.renewalRequest.findMany({
    where: { venueId, isProcessed: false },
    include: { member: true },
    orderBy: { createdAt: "desc" },
  });

  const formatted = requests.map((r) => ({
    id: r.id,
    memberId: r.memberId,
    memberName: r.member.name,
    timestamp: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ requests: formatted });
}
