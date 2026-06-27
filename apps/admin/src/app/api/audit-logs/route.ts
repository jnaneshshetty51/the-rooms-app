import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, unauthorized, forbidden, serverError } from "@the-rooms/api/response";

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") return forbidden("Access denied");

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const entityType = searchParams.get("entityType");
    const action = searchParams.get("action");
    const filterUserId = searchParams.get("userId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = 25;

    const where: Record<string, unknown> = {};

    if (entityType && entityType !== "ALL") {
      where.entity = entityType.toLowerCase();
    }
    if (action && action !== "ALL") {
      where.action = action;
    }
    if (filterUserId && filterUserId !== "ALL") {
      where.userId = filterUserId;
    }
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
      };
    }
    if (search) {
      where.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [rawLogs, total, byActionRaw, byUserRaw] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
      db.auditLog.groupBy({
        by: ["action"],
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
        take: 15,
      }),
      db.auditLog.groupBy({
        by: ["userId"],
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      }),
    ]);

    const logs = rawLogs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: (log.entity?.toUpperCase() || "SYSTEM"),
      entityId: log.entityId,
      description: buildDescription(log.action, log.entity, log.metadata),
      userId: log.userId || "system",
      userName: log.user?.name || log.user?.email || "System",
      userRole: log.user?.role || "SYSTEM",
      ipAddress: log.ipAddress || "N/A",
      userAgent: null,
      changes: null,
      createdAt: log.createdAt.toISOString(),
    }));

    return ok({
      logs,
      total,
      pages: Math.ceil(total / pageSize),
      page,
      summary: {
        totalActions: total,
        byAction: byActionRaw.map((r) => ({ action: r.action, count: r._count._all })),
        byUser: byUserRaw.map((r) => ({
          userId: r.userId || "system",
          userName: "User",
          count: r._count._all,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return serverError("Failed to fetch audit logs", "INTERNAL_ERROR");
  }
}

function buildDescription(action: string, entity: string | null, metadata: unknown): string {
  const e = entity || "item";
  const meta = metadata as Record<string, unknown> | null;
  switch (action) {
    case "CREATE": return `Created ${e}`;
    case "UPDATE": return `Updated ${e}`;
    case "DELETE": return `Deleted ${e}`;
    case "CHECK_IN": return `Guest checked in`;
    case "CHECK_OUT": return `Guest checked out`;
    case "PAYMENT": return `Payment recorded${meta?.amount ? ` (₹${meta.amount})` : ""}`;
    case "LOGIN": return `User logged in`;
    case "LOGOUT": return `User logged out`;
    case "CANCEL": return `Booking cancelled`;
    case "STATUS_CHANGE": return `Status changed${meta?.to ? ` to ${meta.to}` : ""}`;
    default: return `${action} on ${e}`;
  }
}
