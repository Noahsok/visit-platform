export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Calculate dates
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const expireDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      .toISOString()
      .split("T")[0];

    const noteText = `Start: ${startDate} | Expires: ${expireDate}`;

    // Create customer in Square
    const body: any = {
      givenName: firstName,
      familyName: lastName,
      emailAddress: email,
      note: noteText,
    };

    if (phone) {
      body.phoneNumber = phone;
    }

    const { result } = await squareClient.customersApi.createCustomer(body);
    const customer = result.customer;

    if (!customer) {
      return NextResponse.json({ error: "Failed to create member in Square" }, { status: 500 });
    }

    // Save locally via Prisma
    try {
      const venue = await prisma.venue.findFirst({ where: { isActive: true } });
      if (venue) {
        await prisma.signup.create({
          data: {
            firstName,
            lastName,
            email: email || null,
            phone: phone || null,
            venueId: venue.id,
          },
        });
      }
    } catch (dbErr) {
      console.error("Local signup save failed (non-critical):", dbErr);
    }

    return NextResponse.json({
      success: true,
      member: {
        id: customer.id,
        firstName,
        lastName,
        email,
        phone,
        startDate,
        expiration: expireDate,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: error.message || "Signup failed" },
      { status: 500 }
    );
  }
}
