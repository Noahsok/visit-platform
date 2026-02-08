export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "visit2026";

const EMPTY_CONFIG = {
  currentShow: "",
  showEndDate: "",
  galleryHours: "",
  galleryTimes: "",
  upcoming: [],
};

export async function GET() {
  try {
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json(EMPTY_CONFIG);
    }

    const config = await prisma.venueConfig.findUnique({
      where: { venueId: venue.id },
      include: { events: { orderBy: { sortOrder: "asc" } } },
    });

    if (!config) {
      return NextResponse.json(EMPTY_CONFIG);
    }

    return NextResponse.json({
      currentShow: config.currentShow || "",
      showEndDate: config.showEndDate || "",
      galleryHours: config.galleryHours || "",
      galleryTimes: config.galleryTimes || "",
      upcoming: config.events.map((e) => ({ date: e.date, event: e.event })),
    });
  } catch (error) {
    console.error("Config fetch error:", error);
    return NextResponse.json(EMPTY_CONFIG);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentShow, showEndDate, galleryHours, galleryTimes, upcoming, password } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ error: "No venue configured" }, { status: 500 });
    }

    const config = await prisma.venueConfig.upsert({
      where: { venueId: venue.id },
      create: {
        venueId: venue.id,
        currentShow,
        showEndDate,
        galleryHours,
        galleryTimes,
      },
      update: {
        currentShow,
        showEndDate,
        galleryHours,
        galleryTimes,
      },
    });

    // Replace events
    await prisma.venueEvent.deleteMany({
      where: { venueConfigId: config.id },
    });

    if (upcoming && upcoming.length > 0) {
      await prisma.venueEvent.createMany({
        data: upcoming.map((e: { date: string; event: string }, i: number) => ({
          venueConfigId: config.id,
          date: e.date,
          event: e.event,
          sortOrder: i,
        })),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config save error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
