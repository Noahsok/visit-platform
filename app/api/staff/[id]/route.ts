export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, email, role, passcode } = body;

    if (passcode && !/^\d{4}$/.test(passcode)) {
      return NextResponse.json({ error: "Passcode must be 4 digits" }, { status: 400 });
    }

    // Check passcode uniqueness (exclude current user)
    if (passcode) {
      const existing = await prisma.user.findUnique({ where: { passcode } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Passcode already in use" }, { status: 409 });
      }
    }

    // Check email uniqueness (exclude current user)
    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    const updateData: Record<string, string> = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (passcode) updateData.passcode = passcode;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      staff: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        passcode: user.passcode,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.user.update({
      where: { id },
      data: { isActive: false, passcode: null },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
