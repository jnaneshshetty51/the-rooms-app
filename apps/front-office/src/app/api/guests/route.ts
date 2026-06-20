import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { getPropertyIdFromSession, getPropertyIdsFromSession } from "@the-rooms/api/middleware";
import { paginated, created } from "@the-rooms/api/response";
import { z } from "zod";

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const guestQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt", "stayCount"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

const createGuestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional(),
  alternatePhone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  companyName: z.string().optional(),
  notes: z.string().optional(),
});

// GET /api/guests - List all guests with pagination and search
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    // ─── Property Scoping ─────────────────────────────────────────────────────
    // Get property IDs for the user based on role
    const { propertyIds, isSuperAdmin } = await getPropertyIdsFromSession(session);

    // SUPER_ADMIN sees all properties, others filter by accessible properties
    let propertyFilter: Record<string, unknown> = {};
    if (!isSuperAdmin) {
      if (!propertyIds || propertyIds.length === 0) {
        // User has no property access
        return NextResponse.json({ guests: [], total: 0, pages: 0, page: 1 });
      }
      // Filter guests who have bookings at accessible properties
      propertyFilter = {
        bookings: {
          some: {
            room: {
              propertyId: { in: propertyIds }
            }
          }
        }
      };
    }
    // SUPER_ADMIN: no property filter (sees all)

    // Validate query params
    const queryResult = guestQuerySchema.safeParse({
      page: request.nextUrl.searchParams.get("page"),
      perPage: request.nextUrl.searchParams.get("perPage"),
      search: request.nextUrl.searchParams.get("search"),
      sortBy: request.nextUrl.searchParams.get("sortBy"),
      sortOrder: request.nextUrl.searchParams.get("sortOrder"),
    });

    if (!queryResult.success) {
      return NextResponse.json(
        { error: queryResult.error.errors.map(e => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { page, perPage, search, sortBy, sortOrder } = queryResult.data;

    // Build search filter
    const searchFilter = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ]
    } : {};

    // Build sort
    const orderBy: Record<string, "asc" | "desc"> = {};
    if (sortBy === "name" || sortBy === "createdAt") {
      orderBy[sortBy] = sortOrder;
    }

    const where = {
      ...propertyFilter,
      ...searchFilter,
    };

    const [guests, total] = await Promise.all([
      db.guest.findMany({
        where,
        include: {
          _count: {
            select: { bookings: true }
          },
          bookings: {
            select: { room: { select: { propertyId: true } } },
            take: 1,
            orderBy: { checkIn: "desc" },
          }
        },
        orderBy: sortBy === "stayCount"
          ? undefined
          : orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      db.guest.count({ where }),
    ]);

    // Sort by stayCount if requested
    let sortedGuests = guests;
    if (sortBy === "stayCount") {
      sortedGuests = guests.sort((a, b) =>
        sortOrder === "desc"
          ? b._count.bookings - a._count.bookings
          : a._count.bookings - b._count.bookings
      );
    }

    return paginated(sortedGuests, total, page, perPage);
  } catch (error) {
    console.error("Error fetching guests:", error);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate request body
    const bodyResult = createGuestSchema.safeParse(body);
    if (!bodyResult.success) {
      return NextResponse.json(
        { error: bodyResult.error.errors.map(e => e.message).join(", ") },
        { status: 400 }
      );
    }

    const { name, phone, email, alternatePhone, address, city, state, pincode, companyName, notes } = bodyResult.data;

    const guest = await db.guest.create({
      data: { name, phone, email, alternatePhone, address, city, state, pincode, companyName, notes }
    });
    return created(guest);
  } catch (error) {
    console.error("Error creating guest:", error);
    return NextResponse.json({ error: "Failed to create guest" }, { status: 500 });
  }
}
