export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    // Ensure default venue exists
    const venue = await prisma.venue.upsert({
      where: { slug: "newburgh" },
      create: {
        name: "Visit Newburgh",
        slug: "newburgh",
        address: "Newburgh, NY",
        timezone: "America/New_York",
      },
      update: {},
    });

    // Ensure venue config exists
    await prisma.venueConfig.upsert({
      where: { venueId: venue.id },
      create: { venueId: venue.id },
      update: {},
    });

    return NextResponse.json({
      success: true,
      message: "Database initialized",
      venueId: venue.id,
    });
  } catch (error) {
    console.error("DB init error:", error);
    return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 });
  }
}
