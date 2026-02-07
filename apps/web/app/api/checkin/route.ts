export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, memberName, memberEmail, guestCount = 0, isNew = false } = body;

    if (!memberId || !memberName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Prevent duplicate check-in today
    const existing = await pool.query(
      `SELECT id FROM checkins WHERE member_id = $1 AND date = CURRENT_DATE AND checkout_time IS NULL`,
      [memberId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ success: true, message: "Already checked in" });
    }

    await pool.query(
      `INSERT INTO checkins (member_id, member_name, member_email, guest_count, is_new)
       VALUES ($1, $2, $3, $4, $5)`,
      [memberId, memberName, memberEmail || null, guestCount, isNew]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkin error:", error);
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
