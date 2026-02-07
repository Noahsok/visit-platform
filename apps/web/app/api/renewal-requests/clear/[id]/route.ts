export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await pool.query(
      `UPDATE renewal_requests SET cleared = TRUE WHERE member_id = $1 AND cleared = FALSE`,
      [id]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear renewal error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
