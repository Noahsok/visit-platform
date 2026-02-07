import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT id, first_name as "firstName", last_name as "lastName", 
              email, phone, timestamp
       FROM signups 
       WHERE date = CURRENT_DATE 
       ORDER BY timestamp ASC`
    );
    return NextResponse.json({ signups: result.rows });
  } catch (error) {
    console.error("Signups fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch signups" }, { status: 500 });
  }
}
