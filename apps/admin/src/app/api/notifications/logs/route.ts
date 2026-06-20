// apps/admin/src/app/api/notifications/logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string }).role;
        if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "50");

        // Fetch notification history from audit logs
        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where: {
                    action: { in: ["EMAIL_SENT", "EMAIL_FAILED", "PAYMENT", "BOOKING_CONFIRMED"] },
                },
                include: {
                    user: { select: { name: true, email: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * perPage,
                take: perPage,
            }),
            prisma.auditLog.count({
                where: { action: { in: ["EMAIL_SENT", "EMAIL_FAILED", "PAYMENT", "BOOKING_CONFIRMED"] } },
            }),
        ]);

        // Transform logs to notification format
        const notifications = logs.map((log) => {
            const meta = log.metadata as Record<string, string> | null;
            return {
                id: log.id,
                type: log.action === "EMAIL_SENT" ? "EMAIL_SENT" : log.action === "EMAIL_FAILED" ? "EMAIL_FAILED" : "BOOKING_CONFIRMED",
                recipient: meta?.email ?? log.user?.email ?? "—",
                subject: meta?.subject ?? log.action,
                bookingId: log.bookingId ?? meta?.bookingId ?? null,
                sentAt: log.createdAt.toISOString(),
                status: log.action === "EMAIL_FAILED" ? "FAILED" : "SENT",
            };
        });

        return NextResponse.json({
            notifications,
            total,
            pages: Math.ceil(total / perPage),
            page,
        });
    } catch (error) {
        console.error("[NOTIFICATIONS_LOGS_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
