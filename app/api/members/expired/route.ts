export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getAllCustomersWithExpiration } from "@/lib/square";

export async function GET(request: NextRequest) {
  try {
    const customers = await getAllCustomersWithExpiration();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expired = customers
      .filter((c) => {
        const expDate = new Date(c.expiration + "T00:00:00");
        return expDate < today;
      })
      .sort((a, b) => b.expiration.localeCompare(a.expiration));

    return NextResponse.json({ expired });
  } catch (error) {
    console.error("Expired fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expired members" },
      { status: 500 }
    );
  }
}
