export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// GET /api/checkins/export?venueId=xxx
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get("venueId");

  if (!venueId) {
    return NextResponse.json({ error: "venueId required" }, { status: 400 });
  }

  const visits = await prisma.checkIn.findMany({
    where: { venueId },
    include: { member: true },
    orderBy: { checkedInAt: "desc" },
  });

  const lines = ["Date,Name,Email,Check In,Check Out,Guests"];

  for (const v of visits) {
    const date = v.checkedInAt.toISOString().split("T")[0];
    const checkinTime = v.checkedInAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const checkoutTime = v.checkedOutAt
      ? v.checkedOutAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";

    lines.push(
      `${date},"${v.member.name}",${v.member.email || ""},${checkinTime},${checkoutTime},${v.guestCount}`
    );
  }

  const csv = lines.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=visit_history.csv",
    },
  });
}
