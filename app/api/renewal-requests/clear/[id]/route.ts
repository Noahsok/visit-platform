export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // id here is the Square customer ID from checkin.html
    const member = await prisma.member.findUnique({
      where: { squareCustomerId: id },
    });

    if (member) {
      await prisma.renewalRequest.updateMany({
        where: {
          memberId: member.id,
          isProcessed: false,
        },
        data: { isProcessed: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Clear renewal error:", error);
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
