import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/checkins/history?venueId=xxx&date=YYYY-MM-DD
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get("venueId");
  const dateFilter = request.nextUrl.searchParams.get("date");

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  const where: any = { venueId };

  if (dateFilter) {
    const start = new Date(dateFilter + "T00:00:00");
    const end = new Date(dateFilter + "T23:59:59.999");
    where.checkedInAt = { gte: start, lte: end };
  }

  // Get all visits
  const visits = await prisma.checkIn.findMany({
    where,
    include: { member: true },
    orderBy: { checkedInAt: "desc" },
  });

  // Get all signups
  const signupWhere: any = { venueId };
  if (dateFilter) {
    const start = new Date(dateFilter + "T00:00:00");
    const end = new Date(dateFilter + "T23:59:59.999");
    signupWhere.createdAt = { gte: start, lte: end };
  }

  const signups = await prisma.signup.findMany({
    where: signupWhere,
    orderBy: { createdAt: "desc" },
  });

  // Get unique dates
  const allVisits = await prisma.checkIn.findMany({
    where: { venueId },
    select: { checkedInAt: true },
  });

  const dates = [
    ...new Set(
      allVisits.map((v) => v.checkedInAt.toISOString().split("T")[0])
    ),
  ].sort((a, b) => b.localeCompare(a));

  // Member stats (all time for this venue)
  const allTimeVisits = await prisma.checkIn.findMany({
    where: { venueId },
    include: { member: true },
  });

  const memberMap = new Map<
    string,
    { name: string; email: string | null; visitCount: number; lastVisit: string | null }
  >();

  for (const v of allTimeVisits) {
    const existing = memberMap.get(v.memberId);
    const visitDate = v.checkedInAt.toISOString().split("T")[0];

    if (existing) {
      existing.visitCount++;
      if (!existing.lastVisit || visitDate > existing.lastVisit) {
        existing.lastVisit = visitDate;
      }
    } else {
      memberMap.set(v.memberId, {
        name: v.member.name,
        email: v.member.email,
        visitCount: 1,
        lastVisit: visitDate,
      });
    }
  }

  return NextResponse.json({
    visits: visits.map((v) => ({
      id: v.id,
      memberName: v.member.name,
      memberEmail: v.member.email,
      date: v.checkedInAt.toISOString().split("T")[0],
      timestamp: v.checkedInAt.toISOString(),
      checkoutTime: v.checkedOutAt?.toISOString() || null,
      guestCount: v.guestCount,
      isNew: v.isNewMember,
    })),
    signups: signups.map((s) => ({
      firstName: s.firstName,
      lastName: s.lastName,
      email: s.email,
      phone: s.phone,
      date: s.createdAt.toISOString().split("T")[0],
    })),
    dates,
    memberStats: Array.from(memberMap.values()),
  });
}
