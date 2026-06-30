import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, unauthorized, serverError } from "@the-rooms/api/response";
import { z } from "zod";

// ─── GET /api/lost-found ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = 20;

    const where: Record<string, unknown> = {};
    if (status && status !== "ALL") where.status = status;
    if (category && category !== "ALL") where.category = category;
    if (search) {
      where.OR = [
        { itemDescription: { contains: search, mode: "insensitive" } },
        { roomNumber: { contains: search, mode: "insensitive" } },
        { identifiedBy: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
      ];
    }

    const [items, total] = await Promise.all([
      db.lostAndFound.findMany({
        where,
        include: {
          booking: {
            select: {
              bookingNumber: true,
              guest: { select: { name: true, phone: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.lostAndFound.count({ where }),
    ]);

    return ok({ items, total, pages: Math.ceil(total / pageSize), page });
  } catch (error) {
    console.error("Error fetching lost & found items:", error);
    return serverError("Failed to fetch lost & found items", "INTERNAL_ERROR");
  }
}

// ─── POST /api/lost-found ─────────────────────────────────────────────────────

const CreateSchema = z.object({
  bookingId: z.string().optional(),
  roomNumber: z.string().optional(),
  itemDescription: z.string().min(1),
  category: z.enum(["ELECTRONICS", "CLOTHING", "JEWELRY", "DOCUMENTS", "OTHER"]),
  color: z.string().optional(),
  foundDate: z.string(),
  identifiedBy: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized("Authentication required");

    const body = await request.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map((e) => e.message).join(", "));
    }

    const item = await db.lostAndFound.create({
      data: {
        ...parsed.data,
        foundDate: new Date(parsed.data.foundDate),
      },
      include: {
        booking: {
          select: { bookingNumber: true, guest: { select: { name: true } } },
        },
      },
    });

    return ok({ item });
  } catch (error) {
    console.error("Error creating lost & found item:", error);
    return serverError("Failed to create lost & found item", "INTERNAL_ERROR");
  }
}
