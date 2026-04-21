import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;

const profileBody = z.object({
  name: z.string().max(100).nullable().optional(),
  currency: z.enum(CURRENCIES).optional(),
});

// ── GET /api/user/profile ─────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      currency: user.currency,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/user/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── PUT /api/user/profile ─────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const user = await getUser();

    const body = await request.json();
    const parsed = profileBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.currency !== undefined && { currency: parsed.data.currency }),
      },
      select: { id: true, email: true, name: true, currency: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/user/profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
