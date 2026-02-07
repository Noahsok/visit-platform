export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { squareClient } from "@/lib/square";
import pool from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { memberId, memberName } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: "Member ID required" }, { status: 400 });
    }

    // Calculate new expiration (1 year from today)
    const now = new Date();
    const startDate = now.toISOString().split("T")[0];
    const expireDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      .toISOString()
      .split("T")[0];

    const noteText = `Start: ${startDate} | Expires: ${expireDate}`;

    // Update Square customer note with new expiration
    const { result } = await squareClient.customersApi.updateCustomer(memberId, {
      note: noteText,
    });

    if (!result.customer) {
      return NextResponse.json({ error: "Failed to update member in Square" }, { status: 500 });
    }

    // Also save locally
    try {
      await pool.query(
        `INSERT INTO renewal_requests (member_id, member_name)
         VALUES ($1, $2)`,
        [memberId, memberName]
      );
    } catch (dbErr) {
      // Local table might not exist — not critical, Square update succeeded
      console.error("Local renewal save failed (non-critical):", dbErr);
    }

    return NextResponse.json({
      success: true,
      expiration: expireDate,
    });
  } catch (error: any) {
    console.error("Renewal error:", error);
    return NextResponse.json(
      { error: error.message || "Renewal failed" },
      { status: 500 }
    );
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
    return NextResponse.json({ requests: [] });
  }
}
