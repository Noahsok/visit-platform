export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import pool from "@/lib/db";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "visit2026";

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT current_show as "currentShow", show_end_date as "showEndDate",
              gallery_hours as "galleryHours", gallery_times as "galleryTimes",
              upcoming
       FROM site_config WHERE id = 1`
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        currentShow: "",
        showEndDate: "",
        galleryHours: "",
        galleryTimes: "",
        upcoming: [],
      });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Config fetch error:", error);
    return NextResponse.json({
      currentShow: "",
      showEndDate: "",
      galleryHours: "",
      galleryTimes: "",
      upcoming: [],
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentShow, showEndDate, galleryHours, galleryTimes, upcoming, password } = body;

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    await pool.query(
      `UPDATE site_config 
       SET current_show = $1, show_end_date = $2, gallery_hours = $3, 
           gallery_times = $4, upcoming = $5
       WHERE id = 1`,
      [
        currentShow || null,
        showEndDate || null,
        galleryHours || null,
        galleryTimes || null,
        JSON.stringify(upcoming || []),
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Config save error:", error);
    return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
  }
}
