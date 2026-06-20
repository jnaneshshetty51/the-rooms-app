// apps/admin/src/app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, ExpenseCategory } from "@the-rooms/db";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { Prisma } from "@the-rooms/db";
import { z } from "zod";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error("Unauthorized");
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

const createExpenseSchema = z.object({
    description: z.string().min(1).max(255),
    amount: z.number().positive(),
    category: z.nativeEnum(ExpenseCategory),
    date: z.string(),
    vendor: z.string().optional(),
    receiptUrl: z.string().optional(),
});

const updateExpenseSchema = z.object({
    description: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    date: z.string().optional(),
    vendor: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
});

// ─── Guest Lookup ─────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { searchParams } = new URL(request.url);
        const category = searchParams.get("category");
        const search = searchParams.get("search");
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");

        // Get propertyId from session for filtering
        const propertyId = await getPropertyIdFromSession(session);
        const userRole = (session?.user as { role?: string }).role;

        // SUPER_ADMIN sees all properties, others filter by propertyId
        if (userRole !== "SUPER_ADMIN") {
            if (!propertyId) {
                return NextResponse.json({ expenses: [], total: 0, pages: 0, page });
            }
        }

        const whereClause: Prisma.ExpenseWhereInput = {};

        if (userRole !== "SUPER_ADMIN" && propertyId) {
            whereClause.propertyId = propertyId;
        }

        if (category && category !== "all") {
            whereClause.category = category as ExpenseCategory;
        }
        if (search) {
            whereClause.description = { contains: search, mode: "insensitive" };
        }

        const [expenses, total] = await Promise.all([
            db.expense.findMany({
                where: whereClause,
                include: {
                    createdBy: { select: { name: true, email: true } },
                    property: { select: { id: true, name: true } },
                },
                orderBy: { date: "desc" },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            db.expense.count({ where: whereClause }),
        ]);

        // Calculate totals
        const totalAmount = expenses.reduce(
            (sum, exp) => sum + Number(exp.amount),
            0
        );

        return NextResponse.json({
            expenses,
            total,
            pages: Math.ceil(total / perPage),
            page,
            totalAmount,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized")
            return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden")
            return NextResponse.json({ error: message }, { status: 403 });
        console.error("[EXPENSES_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── Create Expense ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        requireAdmin(session);

        const body = await request.json();
        const parsed = createExpenseSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        // Get propertyId from session
        const propertyId = await getPropertyIdFromSession(session);
        if (!propertyId) {
            return NextResponse.json(
                { error: "No property access found" },
                { status: 400 }
            );
        }

        const userId = (session?.user as { id?: string }).id ?? "";

        const expense = await db.expense.create({
            data: {
                description: parsed.data.description,
                amount: parsed.data.amount,
                category: parsed.data.category,
                date: new Date(parsed.data.date),
                vendor: parsed.data.vendor,
                receiptUrl: parsed.data.receiptUrl,
                propertyId,
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
                metadata: JSON.parse(
                    JSON.stringify({
                        description: parsed.data.description,
                        amount: parsed.data.amount,
                        category: parsed.data.category,
                    })
                ),
            },
        });

        return NextResponse.json({ expense }, { status: 201 });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized")
            return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden")
            return NextResponse.json({ error: message }, { status: 403 });
        console.error("[EXPENSES_POST]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
