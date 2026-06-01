// apps/super-admin/src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, ExpenseCategory } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { z } from "zod";

const createExpenseSchema = z.object({
  description: z.string().min(1).max(255),
  amount: z.number().positive(),
  category: z.nativeEnum(ExpenseCategory),
  date: z.string(),
  vendor: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    const whereClause: Prisma.ExpenseWhereInput = {};
    if (category && category !== "all") {
      whereClause.category = category as ExpenseCategory;
    }
    if (search) {
      whereClause.description = { contains: search, mode: "insensitive" };
    }

    const expenses = await db.expense.findMany({
      where: whereClause,
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { date: "desc" },
      take: 100,
    });

    return NextResponse.json({ data: expenses });
  } catch (error) {
    console.error("[EXPENSES_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const userId = (session.user as { id?: string }).id ?? "";

    const expense = await db.expense.create({
      data: {
        description: parsed.data.description,
        amount: parsed.data.amount,
        category: parsed.data.category,
        date: new Date(parsed.data.date),
        vendor: parsed.data.vendor,
        createdById: userId,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: "EXPENSE_CREATED",
        entity: "Expense",
        entityId: expense.id,
        metadata: JSON.parse(JSON.stringify({ description: parsed.data.description, amount: parsed.data.amount, category: parsed.data.category })),
      },
    });

    return NextResponse.json({ data: expense }, { status: 201 });
  } catch (error) {
    console.error("[EXPENSES_POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
