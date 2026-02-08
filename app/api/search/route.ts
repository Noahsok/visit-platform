export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { searchSquareCustomers } from "@/lib/square";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ members: [] });
  }

  try {
    const members = await searchSquareCustomers(q);
    return NextResponse.json({ members });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
