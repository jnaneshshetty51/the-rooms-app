// apps/admin/src/app/api/reports/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

function requireAdmin(session: { user?: { role?: string } | null } | null) {
  if (!session?.user) throw new Error("Unauthorized");
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Forbidden");
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireAdmin(session);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") ?? "1");
    const perPage = parseInt(searchParams.get("perPage") ?? "50");

    // Notification history — we derive this from audit logs for email-related actions
    // In production, you'd have a dedicated email_log table from Resend webhook
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

    // Also query Resend email logs if configured (via @the-rooms/email package)
    // For now, derive email events from audit logs with email metadata
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

    return NextResponse.json({ notifications, total, pages: Math.ceil(total / perPage), page });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    if (message === "Unauthorized") return NextResponse.json({ error: message }, { status: 401 });
    if (message === "Forbidden") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[NOTIFICATIONS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
