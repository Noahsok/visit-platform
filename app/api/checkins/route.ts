export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const date = req.nextUrl.searchParams.get("date");

    // Support querying any date (for history). Default = today.
    const day = date ? new Date(date + "T00:00:00") : new Date();
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);

    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ checkins: [] });
    }

    const checkIns = await prisma.checkIn.findMany({
      where: {
        venueId: venue.id,
        checkedInAt: { gte: day, lt: nextDay },
      },
      include: { member: true },
      orderBy: { checkedInAt: "asc" },
    });

    // Get visit counts for all members in this batch
    const memberIds = [...new Set(checkIns.map((c) => c.memberId))];
    const visitCounts = await prisma.checkIn.groupBy({
      by: ["memberId"],
      where: { memberId: { in: memberIds } },
      _count: { id: true },
    });
    const countMap = new Map(visitCounts.map((v) => [v.memberId, v._count.id]));

    const checkins = checkIns.map((c) => ({
      id: c.id,
      memberId: c.member.squareCustomerId || c.memberId,
      internalMemberId: c.memberId,
      memberName: c.member.name,
      memberEmail: c.member.email,
      memberTier: c.member.tier,
      guestCount: c.guestCount,
      isNew: c.isNewMember,
      visitCount: countMap.get(c.memberId) || 1,
      notes: c.notes,
      timestamp: c.checkedInAt.toISOString(),
      checkoutTime: c.checkedOutAt?.toISOString() || null,
    }));

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error("Checkins fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch checkins" }, { status: 500 });
  }
}

// PATCH — checkout a member or update notes
export async function PATCH(req: NextRequest) {
  try {
    const { id, action, notes } = await req.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (action === "checkout") {
      await prisma.checkIn.update({
        where: { id },
        data: { checkedOutAt: new Date() },
      });
      return NextResponse.json({ success: true });
    }

    if (action === "notes") {
      await prisma.checkIn.update({
        where: { id },
        data: { notes: notes || null },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — bulk auto-checkout (for 8am cron or manual "close out night")
export async function POST(req: NextRequest) {
  try {
    const { action } = await req.json();

    if (action === "checkout-all") {
      const venue = await prisma.venue.findFirst({ where: { isActive: true } });
      if (!venue) return NextResponse.json({ error: "No venue" }, { status: 500 });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await prisma.checkIn.updateMany({
        where: {
          venueId: venue.id,
          checkedInAt: { lt: today },
          checkedOutAt: null,
        },
        data: { checkedOutAt: today },
      });

      return NextResponse.json({ success: true, count: result.count });
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
