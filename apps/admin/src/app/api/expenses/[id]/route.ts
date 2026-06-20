// apps/admin/src/app/api/expenses/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db, ExpenseCategory } from "@the-rooms/db";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { z } from "zod";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
    if (!session?.user) throw new Error("Unauthorized");
    const role = session.user.role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

const updateExpenseSchema = z.object({
    description: z.string().min(1).max(255).optional(),
    amount: z.number().positive().optional(),
    category: z.nativeEnum(ExpenseCategory).optional(),
    date: z.string().optional(),
    vendor: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
});

// ─── Guest Lookup ─────────────────────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;
        const propertyId = await getPropertyIdFromSession(session);
        const userRole = (session?.user as { role?: string }).role;

        const whereClause: Record<string, unknown> = { id };

        // SUPER_ADMIN sees all, others filter by propertyId
        if (userRole !== "SUPER_ADMIN" && propertyId) {
            whereClause.propertyId = propertyId;
        }

        const expense = await db.expense.findFirst({
            where: whereClause,
            include: {
                createdBy: { select: { name: true, email: true } },
                property: { select: { id: true, name: true } },
            },
        });

        if (!expense) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        return NextResponse.json({ expense });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized")
            return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden")
            return NextResponse.json({ error: message }, { status: 403 });
        console.error("[EXPENSE_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── Update Expense ──────────────────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;
        const body = await request.json();
        const parsed = updateExpenseSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid input", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const propertyId = await getPropertyIdFromSession(session);
        const userRole = (session?.user as { role?: string }).role;

        // Check if expense exists and belongs to property
        const whereClause: Record<string, unknown> = { id };
        if (userRole !== "SUPER_ADMIN" && propertyId) {
            whereClause.propertyId = propertyId;
        }

        const existing = await db.expense.findFirst({ where: whereClause });
        if (!existing) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        const updateData: Record<string, unknown> = {};
        if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
        if (parsed.data.amount !== undefined) updateData.amount = parsed.data.amount;
        if (parsed.data.category !== undefined) updateData.category = parsed.data.category;
        if (parsed.data.date !== undefined) updateData.date = new Date(parsed.data.date);
        if (parsed.data.vendor !== undefined) updateData.vendor = parsed.data.vendor;
        if (parsed.data.receiptUrl !== undefined) updateData.receiptUrl = parsed.data.receiptUrl;

        const expense = await db.expense.update({
            where: { id },
            data: updateData,
        });

        // Audit log
        const userId = (session?.user as { id?: string }).id ?? "";
        await db.auditLog.create({
            data: {
                userId,
                action: "EXPENSE_UPDATED",
                entity: "Expense",
                entityId: expense.id,
                metadata: JSON.parse(JSON.stringify(updateData)),
            },
        });

        return NextResponse.json({ expense });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized")
            return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden")
            return NextResponse.json({ error: message }, { status: 403 });
        console.error("[EXPENSE_PATCH]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── Delete Expense ──────────────────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        requireAdmin(session);

        const { id } = await params;
        const propertyId = await getPropertyIdFromSession(session);
        const userRole = (session?.user as { role?: string }).role;

        // Check if expense exists and belongs to property
        const whereClause: Record<string, unknown> = { id };
        if (userRole !== "SUPER_ADMIN" && propertyId) {
            whereClause.propertyId = propertyId;
        }

        const existing = await db.expense.findFirst({ where: whereClause });
        if (!existing) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        await db.expense.delete({ where: { id } });

        // Audit log
        const userId = (session?.user as { id?: string }).id ?? "";
        await db.auditLog.create({
            data: {
                userId,
                action: "EXPENSE_DELETED",
                entity: "Expense",
                entityId: id,
                metadata: JSON.parse(
                    JSON.stringify({
                        description: existing.description,
                        amount: existing.amount,
                        category: existing.category,
                    })
                ),
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal error";
        if (message === "Unauthorized")
            return NextResponse.json({ error: message }, { status: 401 });
        if (message === "Forbidden")
            return NextResponse.json({ error: message }, { status: 403 });
        console.error("[EXPENSE_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
