import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST() {
  try {
    await pool.query(
      `DELETE FROM checkins WHERE date = CURRENT_DATE`
    );
    await pool.query(
      `DELETE FROM signups WHERE date = CURRENT_DATE`
    );
    await pool.query(
      `DELETE FROM renewal_requests WHERE cleared = FALSE AND timestamp::date = CURRENT_DATE`
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
