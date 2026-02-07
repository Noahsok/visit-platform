import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";

export async function POST() {
  try {
    await initDB();
    return NextResponse.json({ success: true, message: "Tables created" });
  } catch (error) {
    console.error("DB init error:", error);
    return NextResponse.json({ error: "Failed to initialize database" }, { status: 500 });
  }
}
