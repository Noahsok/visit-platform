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
      return NextResponse.json({ signups: [] });
    }

    const signups = await prisma.signup.findMany({
      where: {
        venueId: venue.id,
        createdAt: { gte: today, lt: tomorrow },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      signups: signups.map((s) => ({
        id: s.id,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        timestamp: s.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Signups fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch signups" }, { status: 500 });
  }
}
