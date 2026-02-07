import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

export async function GET(request: NextRequest) {
  const dateFilter = request.nextUrl.searchParams.get("date");

  try {
    // Get distinct dates
    const datesResult = await pool.query(
      `SELECT DISTINCT date FROM checkins ORDER BY date DESC LIMIT 90`
    );
    const dates = datesResult.rows.map((r: any) => r.date.toISOString().split("T")[0]);

    // Get visits
    let visitsQuery = `
      SELECT id, member_id as "memberId", member_name as "memberName",
             member_email as "memberEmail", guest_count as "guestCount",
             is_new as "isNew", timestamp, checkout_time as "checkoutTime",
             date
      FROM checkins
    `;
    const visitsParams: any[] = [];

    if (dateFilter) {
      visitsQuery += ` WHERE date = $1`;
      visitsParams.push(dateFilter);
    }

    visitsQuery += ` ORDER BY timestamp DESC LIMIT 500`;
    const visitsResult = await pool.query(visitsQuery, visitsParams);

    // Format visits
    const visits = visitsResult.rows.map((v: any) => ({
      ...v,
      date: v.date.toISOString().split("T")[0],
      withGuest: v.guestCount > 0,
    }));

    // Get member stats (aggregate from all checkins)
    const memberStatsResult = await pool.query(`
      SELECT member_id, member_name as name, member_email as email,
             COUNT(*) as "visitCount",
             MAX(date) as "lastVisit"
      FROM checkins
      GROUP BY member_id, member_name, member_email
      ORDER BY "visitCount" DESC
    `);

    const memberStats = memberStatsResult.rows.map((m: any) => ({
      ...m,
      lastVisit: m.lastVisit?.toISOString().split("T")[0],
    }));

    // Get signups
    let signupsQuery = `
      SELECT id, first_name as "firstName", last_name as "lastName",
             email, phone, date
      FROM signups
    `;
    const signupsParams: any[] = [];

    if (dateFilter) {
      signupsQuery += ` WHERE date = $1`;
      signupsParams.push(dateFilter);
    }

    signupsQuery += ` ORDER BY timestamp DESC`;
    const signupsResult = await pool.query(signupsQuery, signupsParams);

    const signups = signupsResult.rows.map((s: any) => ({
      ...s,
      date: s.date.toISOString().split("T")[0],
    }));

    return NextResponse.json({ visits, memberStats, signups, dates });
  } catch (error) {
    console.error("History fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
