export const dynamic = "force-dynamic";
import { prisma } from "@visit/db";
import { NextRequest, NextResponse } from "next/server";

// POST /api/renewals/[id]/process — mark a renewal as processed
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.renewalRequest.update({
    where: { id: params.id },
    data: { isProcessed: true },
  });

  return NextResponse.json({ success: true });
}
