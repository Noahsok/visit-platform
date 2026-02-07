import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, member_id as "memberId", member_name as "memberName", 
              member_email as "memberEmail", guest_count as "guestCount",
              is_new as "isNew", timestamp, checkout_time as "checkoutTime"
       FROM checkins 
       WHERE date = CURRENT_DATE 
       ORDER BY timestamp ASC`
    );
    return NextResponse.json({ checkins: result.rows });
  } catch (error) {
    console.error("Checkins fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch checkins" }, { status: 500 });
  }
}
