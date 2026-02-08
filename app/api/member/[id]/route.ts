export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSquareMemberDetails } from "@/lib/square";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const member = await getSquareMemberDetails(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    return NextResponse.json({ member });
  } catch (error) {
    console.error("Member fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}
