import { NextResponse } from "next/server";
import pool from "@/lib/db";

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
