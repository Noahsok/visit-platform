import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    await pool.query(
      `UPDATE checkins SET checkout_time = NOW() 
       WHERE member_id = $1 AND date = CURRENT_DATE AND checkout_time IS NULL`,
      [memberId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
