export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET /api/venue-config?venueId=xxx
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  const config = await prisma.venueConfig.findUnique({
    where: { venueId },
    include: {
      events: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!config) {
    return NextResponse.json({
      currentShow: "",
      showEndDate: "",
      galleryHours: "",
      galleryTimes: "",
      upcoming: [],
    });
  }

  return NextResponse.json({
    currentShow: config.currentShow || "",
    showEndDate: config.showEndDate || "",
    galleryHours: config.galleryHours || "",
    galleryTimes: config.galleryTimes || "",
    upcoming: config.events.map((e) => ({ date: e.date, event: e.event })),
  });
}

// POST /api/venue-config — save venue config
export async function POST(request: NextRequest) {
  const { venueId, currentShow, showEndDate, galleryHours, galleryTimes, upcoming } =
    await request.json();

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  // Upsert the config
  const config = await prisma.venueConfig.upsert({
    where: { venueId },
    create: {
      venueId,
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
}
