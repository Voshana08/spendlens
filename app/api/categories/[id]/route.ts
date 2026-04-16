import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUser, AuthError } from "@/lib/auth/get-user";

const categoryBody = z.object({
  name: z.string().min(1, "Name is required").max(50),
  icon: z.string().min(1, "Icon is required"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex colour (e.g. #F97316)"),
});

type Params = { params: { id: string } };

// ── PUT /api/categories/[id] ──────────────────────────────────────────────────

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = categoryBody.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: { id: params.id },
      data: parsed.data,
    });

    return NextResponse.json(category);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[PUT /api/categories/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── DELETE /api/categories/[id] ───────────────────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const user = await getUser();

    const existing = await prisma.category.findUnique({
      where: { id: params.id },
    });

    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Default categories cannot be deleted." },
        { status: 400 }
      );
    }

    const [transactionCount, budgetCount] = await Promise.all([
      prisma.transaction.count({ where: { categoryId: params.id } }),
      prisma.budget.count({ where: { categoryId: params.id } }),
    ]);

    if (transactionCount > 0) {
      return NextResponse.json(
        {
          error: `This category is used by ${transactionCount} transaction${transactionCount === 1 ? "" : "s"} and cannot be deleted.`,
        },
        { status: 400 }
      );
    }

    if (budgetCount > 0) {
      return NextResponse.json(
        {
          error: `This category is used by ${budgetCount} budget${budgetCount === 1 ? "" : "s"} and cannot be deleted.`,
        },
        { status: 400 }
      );
    }

    await prisma.category.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[DELETE /api/categories/[id]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
