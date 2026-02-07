export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get default venue
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ success: true });
    }

    // Clear today's check-ins
    await prisma.checkIn.deleteMany({
      where: {
        venueId: venue.id,
        checkedInAt: { gte: today, lt: tomorrow },
      },
    });

    // Clear today's signups
    await prisma.signup.deleteMany({
      where: {
        venueId: venue.id,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    // Clear unprocessed renewal requests from today
    await prisma.renewalRequest.deleteMany({
      where: {
        venueId: venue.id,
        isProcessed: false,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
