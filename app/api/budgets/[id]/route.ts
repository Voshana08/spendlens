import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

type Params = { params: { id: string } };

const updateBody = z.object({
  amount: z.number().positive(),
});

// ── PUT /api/budgets/[id] ─────────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.budget.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const budget = await prisma.budget.update({
      where: { id: params.id },
      data: { amount: parsed.data.amount },
      include: { category: true },
    });

    return NextResponse.json(budget);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/budgets/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/budgets/[id] ──────────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.budget.findUnique({ where: { id: params.id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.budget.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/budgets/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
