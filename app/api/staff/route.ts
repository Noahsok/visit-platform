export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const venueSlug = searchParams.get("venue") || "newburgh";

    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const access = await prisma.userVenueAccess.findMany({
      where: { venueId: venue.id },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    });

    const staff = access
      .filter((a) => a.user.isActive)
      .map((a) => ({
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        role: a.user.role,
        passcode: a.user.passcode,
        isActive: a.user.isActive,
      }));

    return NextResponse.json({ staff });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, role, passcode, venue: venueSlug } = body;

    if (!name || !email || !role || !passcode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!/^\d{4}$/.test(passcode)) {
      return NextResponse.json({ error: "Passcode must be 4 digits" }, { status: 400 });
    }

    // Check passcode uniqueness
    const existing = await prisma.user.findUnique({ where: { passcode } });
    if (existing) {
      return NextResponse.json({ error: "Passcode already in use" }, { status: 409 });
    }

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const venue = await prisma.venue.findUnique({ where: { slug: venueSlug || "newburgh" } });
    if (!venue) {
      return NextResponse.json({ error: "Venue not found" }, { status: 404 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        passcode,
      },
    });

    await prisma.userVenueAccess.create({
      data: { userId: user.id, venueId: venue.id },
    });

    return NextResponse.json({
      staff: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passcode: user.passcode,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
