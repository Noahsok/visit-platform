export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllCustomersWithExpiration } from "@/lib/square";

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") || "30");

  try {
    const customers = await getAllCustomersWithExpiration();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + days);

    const expiring = customers
      .filter((c) => {
        const expDate = new Date(c.expiration + "T00:00:00");
        return expDate >= today && expDate <= cutoff;
      })
      .sort((a, b) => a.expiration.localeCompare(b.expiration));

    return NextResponse.json({ expiring });
  } catch (error) {
    console.error("Expiring fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expiring members" },
      { status: 500 }
    );
  }
}
