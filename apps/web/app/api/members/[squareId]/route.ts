export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSquareMemberDetails } from "@/lib/square";

export async function GET(
  request: NextRequest,
  { params }: { params: { squareId: string } }
) {
  try {
    const member = await getSquareMemberDetails(params.squareId);

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    return NextResponse.json({ member });
  } catch (error) {
    console.error("Member lookup error:", error);
    return NextResponse.json(
      { error: "Failed to fetch member" },
      { status: 500 }
    );
  }
}
