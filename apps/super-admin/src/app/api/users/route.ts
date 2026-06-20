// apps/super-admin/src/app/api/users/route.ts
import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, created, badRequest, serverError, forbidden } from "@the-rooms/api/response";
import { z } from "zod";
import bcrypt from "bcryptjs";

const createUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  role: z.enum(["ADMIN", "FRONT_OFFICE"]),
  password: z.string().min(8),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "FRONT_OFFICE"]).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");
    const isActive = searchParams.get("isActive");

    const whereClause: Record<string, unknown> = {};
    if (role) whereClause.role = role;
    if (isActive !== null) whereClause.isActive = isActive === "true";

    // Only ADMIN and FRONT_OFFICE users for Super Admin management
    const users = await db.user.findMany({
      where: {
        ...whereClause,
        role: { in: ["ADMIN", "FRONT_OFFICE"] },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
        attempts: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return ok({ users });
  } catch (error) {
    console.error("[USERS_GET]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return forbidden("Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        `Invalid input: ${parsed.error.errors.map(e => e.message).join(', ')}`,
        "VALIDATION_ERROR"
      );
    }

    const { name, email, role, password } = parsed.data;

    // Check if email already exists
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return badRequest("A user with this email already exists", "CONFLICT");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const creatorId = (session.user as { id?: string }).id ?? "";

    const user = await db.user.create({
      data: {
        name,
        email,
        role,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: creatorId,
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        metadata: { newUserEmail: email, role },
      },
    });

    return created({ user });
  } catch (error) {
    console.error("[USERS_POST]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return forbidden("Forbidden", "FORBIDDEN");
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return badRequest("User ID required", "VALIDATION_ERROR");
    }

    const parsed = updateUserSchema.safeParse(updates);
    if (!parsed.success) {
      return badRequest(
        `Invalid input: ${parsed.error.errors.map(e => e.message).join(', ')}`,
        "VALIDATION_ERROR"
      );
    }

    // Prevent self-demotion
    const currentUserId = (session.user as { id?: string }).id ?? "";
    if (id === currentUserId && parsed.data.role) {
      return badRequest("Cannot change your own role", "FORBIDDEN");
    }

    const user = await db.user.update({
      where: { id },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: currentUserId,
        action: "USER_UPDATED",
        entity: "User",
        entityId: id,
        metadata: JSON.parse(JSON.stringify(parsed.data)),
      },
    });

    return ok({ user });
  } catch (error) {
    console.error("[USERS_PATCH]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const userRole = (session.user as { role?: string }).role;
    if (userRole !== "SUPER_ADMIN") {
      return forbidden("Forbidden", "FORBIDDEN");
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return badRequest("User ID required", "VALIDATION_ERROR");
    }

    // Prevent self-deletion
    const currentUserId = (session.user as { id?: string }).id ?? "";
    if (id === currentUserId) {
      return badRequest("Cannot delete your own account", "FORBIDDEN");
    }

    // Check user exists and is not SUPER_ADMIN
    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return badRequest("User not found", "NOT_FOUND");
    }
    if (targetUser.role === "SUPER_ADMIN") {
      return forbidden("Cannot delete Super Admin accounts", "FORBIDDEN");
    }

    await db.user.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: currentUserId,
        action: "USER_DELETED",
        entity: "User",
        entityId: id,
        metadata: { deletedUserEmail: targetUser.email },
      },
    });

    return ok({ deleted: true });
  } catch (error) {
    console.error("[USERS_DELETE]", error);
    return serverError("Internal server error", "INTERNAL_ERROR");
  }
}
