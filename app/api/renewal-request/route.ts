export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { memberId, memberName } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Calculate new expiration (1 year from today)
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const expireDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      .toISOString()
      .split("T")[0];

    const noteText = `Start: ${startDate} | Expires: ${expireDate}`;

    // Update Square customer note with new expiration
    const { result } = await squareClient.customersApi.updateCustomer(memberId, {
      note: noteText,
    });

    if (!result.customer) {
      return NextResponse.json({ error: "Failed to update member in Square" }, { status: 500 });
    }

    // Save locally via Prisma
    try {
      const venue = await prisma.venue.findFirst({ where: { isActive: true } });
      const member = await prisma.member.findUnique({
        where: { squareCustomerId: memberId },
      });

      if (venue && member) {
        await prisma.renewalRequest.create({
          data: {
            memberId: member.id,
            venueId: venue.id,
          },
        });
      }
    } catch (dbErr) {
      console.error("Local renewal save failed (non-critical):", dbErr);
    }

    return NextResponse.json({
      success: true,
      expiration: expireDate,
    });
  } catch (error: any) {
    console.error("Renewal error:", error);
    return NextResponse.json(
      { error: error.message || "Renewal failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ requests: [] });
    }

    const requests = await prisma.renewalRequest.findMany({
      where: { venueId: venue.id, isProcessed: false },
      include: { member: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      requests: requests.map((r) => ({
        id: r.id,
        memberId: r.member.squareCustomerId,
        memberName: r.member.name,
        timestamp: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Renewal fetch error:", error);
    return NextResponse.json({ requests: [] });
  }
}
