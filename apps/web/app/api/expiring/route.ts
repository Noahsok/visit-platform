import { NextRequest, NextResponse } from "next/server";
import { getAllCustomersWithExpiration } from "@/lib/square";

export async function GET(request: NextRequest) {
  const days = parseInt(request.nextUrl.searchParams.get("days") || "30");

  try {
    const allMembers = await getAllCustomersWithExpiration();
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);

    const expiring = allMembers.filter((m) => {
      const exp = new Date(m.expiration + "T00:00:00");
      return exp >= today && exp <= futureDate;
    });

    // Sort by soonest first
    expiring.sort(
      (a, b) =>
        new Date(a.expiration).getTime() - new Date(b.expiration).getTime()
    );

    return NextResponse.json({ expiring });
  } catch (error) {
    console.error("Expiring fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch expiring" }, { status: 500 });
  }
}
