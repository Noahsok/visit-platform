export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import { prisma } from "@/lib/prisma";

async function findExpirationKey(): Promise<string | null> {
  try {
    const { result } =
      await squareClient.customerCustomAttributesApi.listCustomerCustomAttributeDefinitions();
    const definitions = result.customAttributeDefinitions || [];
    for (const def of definitions) {
      const name = (def.name || "").toLowerCase();
      if (name.includes("expir") || name.includes("expiration")) {
        return def.key || null;
      }
    }
  } catch (e) {
    console.error("Error finding expiration key:", e);
  }
  return null;
}

async function findGroupId(
  tierName: string
): Promise<string | null> {
  try {
    const { result } =
      await squareClient.customerGroupsApi.listCustomerGroups();
    const groups = result.groups || [];
    const target = tierName.toLowerCase();
    for (const g of groups) {
      if ((g.name || "").toLowerCase().includes(target)) {
        return g.id || null;
      }
    }
  } catch (e) {
    console.error("Error finding group:", e);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { firstName, lastName, email, phone, tier } = await request.json();

    if (!firstName || !lastName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Calculate dates
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const expireDate = new Date(
      now.getFullYear() + 1,
      now.getMonth(),
      now.getDate()
    )
      .toISOString()
      .split("T")[0];

    const memberTier = tier === "Enthusiast" ? "Enthusiast" : "Classic";

    // Note field as fallback
    const noteText = `Start: ${startDate} | Expires: ${expireDate} | Tier: ${memberTier}`;

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
      return NextResponse.json(
        { error: "Failed to create member in Square" },
        { status: 500 }
      );
    }

    const customerId = customer.id!;

    // Set Expiration Date custom attribute
    const expirationKey = await findExpirationKey();
    if (expirationKey) {
      try {
        await squareClient.customerCustomAttributesApi.upsertCustomerCustomAttribute(
          customerId,
          expirationKey,
          {
            customAttribute: {
              value: expireDate,
            },
          }
        );
        console.log(`Set expiration ${expireDate} for customer ${customerId}`);
      } catch (e) {
        console.error("Failed to set expiration custom attribute:", e);
        // Note field is the fallback, so this isn't fatal
      }
    } else {
      console.warn(
        "Expiration custom attribute key not found — using note field only"
      );
    }

    // Add to correct customer group (Classic or Enthusiast)
    const groupId = await findGroupId(memberTier);
    if (groupId) {
      try {
        await squareClient.customerGroupsApi.addGroupToCustomer(
          customerId,
          groupId
        );
        console.log(`Added customer ${customerId} to ${memberTier} group`);
      } catch (e) {
        console.error("Failed to add customer to group:", e);
      }
    } else {
      console.warn(`Group "${memberTier}" not found in Square`);
    }

    // Save locally via Prisma
    try {
      const venue = await prisma.venue.findFirst({
        where: { isActive: true },
      });
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
        id: customerId,
        firstName,
        lastName,
        email,
        phone,
        tier: memberTier,
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
