import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const investmentBody = z.object({
  name: z.string().min(1, "Name is required").max(100),
  type: z.enum(["STOCK", "CRYPTO", "ETF", "BOND", "PROPERTY", "OTHER"]),
  buyPrice: z.number().positive("Buy price must be positive"),
  quantity: z.number().positive("Quantity must be positive"),
  currentValue: z.number().nonnegative("Current price cannot be negative"),
  purchaseDate: z.string().datetime(),
  notes: z.string().max(500).nullable().optional(),
});

// ── GET /api/investments ──────────────────────────────────────────────────────

export async function GET() {
  try {
    const user = await getUser();

    const investments = await prisma.investment.findMany({
      where: { userId: user.id },
      orderBy: { purchaseDate: "desc" },
    });

    return NextResponse.json(investments);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[GET /api/investments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── POST /api/investments ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    const body = await request.json();
    const parsed = investmentBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const investment = await prisma.investment.create({
      data: { ...parsed.data, userId: user.id },
    });

    return NextResponse.json(investment, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[POST /api/investments]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
