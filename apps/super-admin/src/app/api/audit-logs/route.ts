// apps/super-admin/src/app/api/audit-logs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { Prisma } from "@the-rooms/db";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  userId: z.string().optional(),
  action: z.string().optional(),
  entity: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  category: z.string().optional(),
});

const ACTION_CATEGORIES: Record<string, string[]> = {
  AUTH: ["USER_LOGIN", "USER_LOGOUT", "LOGIN_FAILED", "PASSWORD_RESET"],
  BOOKING: ["BOOKING_CREATED", "BOOKING_UPDATED", "BOOKING_CANCELLED", "CHECKIN_COMPLETED", "CHECKOUT_COMPLETED", "EXTEND_STAY"],
  PAYMENT: ["PAYMENT_RECEIVED", "PAYMENT_FAILED", "REFUND_ISSUED", "PAYMENT_UPDATED"],
  ROOM: ["ROOM_STATUS_CHANGED", "ROOM_CREATED", "ROOM_UPDATED", "ROOM_PHOTO_UPLOADED"],
  GUEST: ["GUEST_CREATED", "GUEST_UPDATED", "DOCUMENT_UPLOADED", "DOCUMENT_VERIFIED"],
  USER: ["USER_CREATED", "USER_UPDATED", "USER_DELETED", "USER_ACTIVATED", "USER_DEACTIVATED"],
  SYSTEM: ["BACKUP_TRIGGERED", "BACKUP_COMPLETED", "SETTINGS_UPDATED", "CONFIG_CHANGED", "MAINTENANCE_MODE_ENABLED"],
};

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { page, pageSize, userId, action, entity, search, dateFrom, dateTo, category } =
      parsed.data;

    // Build where clause
    const whereClause: Prisma.AuditLogWhereInput = {};

    if (userId) whereClause.userId = userId;
    if (entity) whereClause.entity = { contains: entity, mode: "insensitive" };
    if (dateFrom) {
      whereClause.createdAt = {
        ...(whereClause.createdAt as object),
        gte: new Date(dateFrom),
      };
    }
    if (dateTo) {
      whereClause.createdAt = {
        ...(whereClause.createdAt as object),
        lte: new Date(dateTo + "T23:59:59"),
      };
    }
    if (action) {
      whereClause.action = { contains: action, mode: "insensitive" };
    }
    if (search) {
      whereClause.OR = [
        { action: { contains: search, mode: "insensitive" } },
        { entity: { contains: search, mode: "insensitive" } },
        { entityId: { contains: search, mode: "insensitive" } },
        { ipAddress: { contains: search, mode: "insensitive" } },
      ];
    }
    if (category && category !== "all" && ACTION_CATEGORIES[category]) {
      whereClause.action = {
        in: ACTION_CATEGORIES[category],
      };
    }

    // 90-day retention filter
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    whereClause.createdAt = {
      ...(whereClause.createdAt as object),
      gte: ninetyDaysAgo,
    };

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where: whereClause }),
    ]);

    const formattedLogs = logs.map((log) => {
      const actionUpper = log.action.toUpperCase();
      let category: string = "SYSTEM";
      for (const [cat, actions] of Object.entries(ACTION_CATEGORIES)) {
        if (actions.some((a) => log.action.includes(a))) {
          category = cat;
          break;
        }
      }

      return {
        id: log.id,
        userId: log.userId,
        userName: log.user?.name ?? "System",
        userEmail: log.user?.email ?? "",
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
        category,
      };
    });

    return NextResponse.json({
      data: formattedLogs,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasNextPage: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOGS_GET]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
