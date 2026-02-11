export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import { prisma } from "@/lib/prisma";

async function findCustomAttributeKeys(): Promise<{
  expirationKey: string | null;
  startDateKey: string | null;
}> {
  let expirationKey: string | null = null;
  let startDateKey: string | null = null;

  try {
    const { result } =
      await squareClient.customerCustomAttributesApi.listCustomerCustomAttributeDefinitions();
    const definitions = result.customAttributeDefinitions || [];
    console.log(
      "Custom attribute definitions:",
      definitions.map((d) => ({ key: d.key, name: d.name }))
    );

    for (const def of definitions) {
      const name = (def.name || "").toLowerCase();
      const key = def.key || "";
      if (name.includes("expir") || name.includes("expiration")) {
        expirationKey = key;
      }
      if (name.includes("start") && name.includes("date")) {
        startDateKey = key;
      }
    }
  } catch (e) {
    console.error("Error finding custom attribute keys:", e);
  }

  return { expirationKey, startDateKey };
}

async function findGroupId(tierName: string): Promise<string | null> {
  try {
    const { result } =
      await squareClient.customerGroupsApi.listCustomerGroups();
    const groups = result.groups || [];
    console.log(
      "Available groups:",
      groups.map((g) => ({ id: g.id, name: g.name }))
    );

    const target = tierName.toLowerCase();
    for (const g of groups) {
      const groupName = (g.name || "").toLowerCase();
      if (groupName === target || groupName.includes(target)) {
        console.log(`Matched group "${g.name}" (${g.id}) for tier "${tierName}"`);
        return g.id || null;
      }
    }
    console.warn(`No group matched for tier "${tierName}"`);
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
  let formatted = phone.replace(/[\s\-\(\)\.]/g, "");
  if (formatted.length === 10) formatted = "+1" + formatted;
  else if (formatted.length === 11 && formatted.startsWith("1")) formatted = "+" + formatted;
  else if (!formatted.startsWith("+")) formatted = "+1" + formatted;
  body.phoneNumber = formatted;
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
    console.log(`Created customer ${customerId}: ${firstName} ${lastName}`);

    // Set custom attributes (Start Date + Expiration Date)
    const { expirationKey, startDateKey } = await findCustomAttributeKeys();

    if (startDateKey) {
      try {
        await squareClient.customerCustomAttributesApi.upsertCustomerCustomAttribute(
          customerId,
          startDateKey,
          { customAttribute: { value: startDate } }
        );
        console.log(`Set start date ${startDate} for customer ${customerId}`);
      } catch (e) {
        console.error("Failed to set start date custom attribute:", e);
      }
    } else {
      console.warn("Start date custom attribute key not found");
    }

    if (expirationKey) {
      try {
        await squareClient.customerCustomAttributesApi.upsertCustomerCustomAttribute(
          customerId,
          expirationKey,
          { customAttribute: { value: expireDate } }
        );
        console.log(`Set expiration ${expireDate} for customer ${customerId}`);
      } catch (e) {
        console.error("Failed to set expiration custom attribute:", e);
      }
    } else {
      console.warn("Expiration custom attribute key not found");
    }

    // Add to correct customer group (Classic or Enthusiast)
    const groupId = await findGroupId(memberTier);
    if (groupId) {
      try {
        await squareClient.customersApi.addGroupToCustomer(
          customerId,
          groupId
        );
        console.log(`Added customer ${customerId} to group ${memberTier} (${groupId})`);
      } catch (e: any) {
        console.error("Failed to add customer to group:", e?.errors || e);
      }
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
