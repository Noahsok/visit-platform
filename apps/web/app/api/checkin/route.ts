export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, memberName, memberEmail, guestCount = 0, isNew = false } = body;

    if (!memberId || !memberName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Get default venue
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ error: "No venue configured" }, { status: 500 });
    }

    // Find or create member by Square ID
    let member = await prisma.member.findUnique({
      where: { squareCustomerId: memberId },
    });

    if (!member) {
      member = await prisma.member.create({
        data: {
          squareCustomerId: memberId,
          name: memberName,
          email: memberEmail || null,
        },
      });
    }

    // Check for duplicate today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existing = await prisma.checkIn.findFirst({
      where: {
        memberId: member.id,
        venueId: venue.id,
        checkedInAt: { gte: today, lt: tomorrow },
        checkedOutAt: null,
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, message: "Already checked in" });
    }

    await prisma.checkIn.create({
      data: {
        memberId: member.id,
        venueId: venue.id,
        guestCount,
        isNewMember: isNew,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
