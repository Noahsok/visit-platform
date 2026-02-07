export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await prisma.renewalRequest.findMany({
      where: {
        venueId: venue.id,
        isProcessed: false,
      },
      include: { member: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        memberId: r.member.squareCustomerId || r.memberId,
        memberName: r.member.name,
        timestamp: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Renewal fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 });
  }
}
