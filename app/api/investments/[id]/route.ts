import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

type Params = { params: { id: string } };

const updateBody = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(["STOCK", "CRYPTO", "ETF", "BOND", "PROPERTY", "OTHER"]),
  buyPrice: z.number().positive(),
  quantity: z.number().positive(),
  currentValue: z.number().nonnegative(),
  purchaseDate: z.string().datetime(),
  notes: z.string().max(500).nullable().optional(),
});

// ── PUT /api/investments/[id] ─────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.investment.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const investment = await prisma.investment.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json(investment);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/investments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/investments/[id] ──────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.investment.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.investment.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/investments/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
