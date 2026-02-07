export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { memberId, memberName } = await request.json();

    await pool.query(
      `INSERT INTO renewal_requests (member_id, member_name)
       VALUES ($1, $2)`,
      [memberId, memberName]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Renewal request error:", error);
    return NextResponse.json({ error: "Failed to save request" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, member_id as "memberId", member_name as "memberName", timestamp
       FROM renewal_requests 
       WHERE cleared = FALSE 
       ORDER BY timestamp DESC`
    );
    return NextResponse.json({ requests: result.rows });
  } catch (error) {
    console.error("Renewal fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch renewals" }, { status: 500 });
  }
}
