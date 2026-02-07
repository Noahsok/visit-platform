export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { memberId, memberName } = await request.json();

    // Get default venue
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ error: "No venue configured" }, { status: 500 });
    }

    // Find or create member
    let member = await prisma.member.findUnique({
      where: { squareCustomerId: memberId },
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          squareCustomerId: memberId,
          name: memberName,
        },
      });
    }

    await prisma.renewalRequest.create({
      data: {
        memberId: member.id,
        venueId: venue.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Renewal request error:", error);
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }
}

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
