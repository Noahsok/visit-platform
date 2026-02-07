import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT member_name, member_email, guest_count, is_new,
             timestamp, checkout_time, date
      FROM checkins
      ORDER BY timestamp DESC
    `);

    const lines = ["Date,Name,Email,Guests,New Member,Check In,Check Out"];
    for (const row of result.rows) {
      const date = row.date.toISOString().split("T")[0];
      const checkin = new Date(row.timestamp).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      const checkout = row.checkout_time
        ? new Date(row.checkout_time).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })
        : "";

      lines.push(
        `${date},"${row.member_name}",${row.member_email || ""},${row.guest_count},${row.is_new},${checkin},${checkout}`
      );
    }

    const csv = lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=visit_history.csv",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
