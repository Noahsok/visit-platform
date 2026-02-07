import { NextResponse } from "next/server";
import { getAllCustomersWithExpiration } from "@/lib/square";

export async function GET() {
  try {
    const allMembers = await getAllCustomersWithExpiration();
    const today = new Date();

    const expired = allMembers.filter((m) => {
      const exp = new Date(m.expiration + "T00:00:00");
      return exp < today;
    });

    // Sort by most recently expired first
    expired.sort(
      (a, b) =>
        new Date(b.expiration).getTime() - new Date(a.expiration).getTime()
    );

    return NextResponse.json({ expired });
  } catch (error) {
    console.error("Expired fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch expired" }, { status: 500 });
  }
}
