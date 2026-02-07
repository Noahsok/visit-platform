export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get default venue
    const venue = await prisma.venue.findFirst({ where: { isActive: true } });
    if (!venue) {
      return NextResponse.json({ error: "No venue configured" }, { status: 500 });
    }

    await prisma.signup.create({
      data: {
        venueId: venue.id,
        firstName,
        lastName,
        email: email || null,
        phone: phone || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
