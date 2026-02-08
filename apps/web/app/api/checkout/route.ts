export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    // memberId here is the Square customer ID from checkin.html
    const member = await prisma.member.findUnique({
      where: { squareCustomerId: memberId },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's active check-in for this member
    const checkIn = await prisma.checkIn.findFirst({
      where: {
        memberId: member.id,
        checkedInAt: { gte: today, lt: tomorrow },
        checkedOutAt: null,
      },
    });

    if (checkIn) {
      await prisma.checkIn.update({
        where: { id: checkIn.id },
        data: { checkedOutAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
