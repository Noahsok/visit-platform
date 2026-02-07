export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get default venue
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ checkins: [] });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        venueId: venue.id,
        checkedInAt: { gte: today, lt: tomorrow },
      },
      include: { member: true },
      orderBy: { checkedInAt: "asc" },
    });

    // Map to the format checkin.html expects
    const checkins = checkIns.map((c) => ({
      id: c.id,
      memberId: c.member.squareCustomerId || c.memberId,
      memberName: c.member.name,
      memberEmail: c.member.email,
      guestCount: c.guestCount,
      isNew: c.isNewMember,
      timestamp: c.checkedInAt.toISOString(),
      checkoutTime: c.checkedOutAt?.toISOString() || null,
    }));

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error("Checkins fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch checkins" }, { status: 500 });
  }
}
