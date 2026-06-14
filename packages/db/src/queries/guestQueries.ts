import prisma from "../index";

// ─── Guest Lookup ─────────────────────────────────────────────────────────

export async function getGuestByEmail(email: string) {
  return prisma.guest.findFirst({ where: { email } });
}

export async function getGuestByPhone(phone: string) {
  return prisma.guest.findFirst({ where: { phone } });
}

// ─── Guest Documents ────────────────────────────────────────────────────────

export type DocumentType = "AADHAAR" | "PASSPORT" | "VOTER_ID" | "DRIVING_LICENSE";

export type UploadDocumentData = {
  guestId: string;
  bookingId?: string;
  uploadedById?: string;
  documentType: DocumentType;
  frontUrl: string;
  backUrl?: string;
};

/**
 * Upload a guest document
 */
export async function uploadGuestDocument(data: UploadDocumentData) {
  return prisma.guestDocument.create({
    data: {
      guestId: data.guestId,
      bookingId: data.bookingId ?? null,
      uploadedById: data.uploadedById ?? null,
      documentType: data.documentType,
      frontUrl: data.frontUrl,
      backUrl: data.backUrl ?? null,
      verified: false,
    },
  });
}

/**
 * Get all documents for a guest
 */
export async function getGuestDocuments(guestId: string) {
  return prisma.guestDocument.findMany({
    where: { guestId },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
        },
      },
    },
    orderBy: { uploadedAt: "desc" },
  });
}

/**
 * Get documents for a specific booking
 */
export async function getDocumentsByBooking(bookingId: string) {
  return prisma.guestDocument.findMany({
    where: { bookingId },
    orderBy: { uploadedAt: "desc" },
  });
}

// ─── Complaints ───────────────────────────────────────────────────────────────

export type ComplaintSubject =
  | "room_cleanliness"
  | "ac_issue"
  | "plumbing_issue"
  | "wifi_issue"
  | "noise_complaint"
  | "staff_behavior"
  | "food_quality"
  | "other";

export type CreateComplaintData = {
  bookingId: string;
  subject: string;
  description: string;
  isUrgent?: boolean;
  imageUrl?: string;
};

/**
 * Create a guest complaint
 */
export async function createComplaint(data: CreateComplaintData) {
  return prisma.complaint.create({
    data: {
      bookingId: data.bookingId,
      subject: data.subject,
      description: data.description,
      isUrgent: data.isUrgent ?? false,
      imageUrl: data.imageUrl ?? null,
      status: "OPEN",
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
          guest: { select: { name: true, phone: true, email: true } },
        },
      },
    },
  });
}

/**
 * Get complaints for a guest (via their bookings)
 */
export async function getGuestComplaints(guestId: string) {
  return prisma.complaint.findMany({
    where: {
      booking: { guestId },
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get complaint by booking ID
 */
export async function getComplaintByBooking(bookingId: string) {
  return prisma.complaint.findUnique({
    where: { bookingId },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
          guest: { select: { name: true, phone: true, email: true } },
        },
      },
    },
  });
}

// ─── Invoices ────────────────────────────────────────────────────────────────

/**
 * Get all invoices for a guest's bookings
 */
export async function getGuestInvoices(guestId: string) {
  return prisma.invoice.findMany({
    where: {
      booking: { guestId },
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          method: true,
          transactionId: true,
          status: true,
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });
}

/**
 * Get invoice by ID
 */
export async function getInvoiceById(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      booking: {
        include: {
          guest: true,
          room: {
            include: {
              photos: { take: 1 },
              amenities: { include: { amenity: true } },
            },
          },
        },
      },
      payment: true,
    },
  });
}

// ─── Extend Stay Requests ─────────────────────────────────────────────────────

export type ExtendStayData = {
  bookingId: string;
  newCheckOut: Date;
  reason?: string;
};

/**
 * Get extend stay request for a booking
 */
export async function getExtendStayRequest(bookingId: string) {
  // We store extension requests as audit logs
  return prisma.auditLog.findFirst({
    where: {
      bookingId,
      action: "EXTEND_REQUEST",
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Create an extend stay request (stored as audit log + could extend booking status)
 */
export async function createExtendStayRequest(data: ExtendStayData) {
  // Update booking with new check-out date
  const booking = await prisma.booking.update({
    where: { id: data.bookingId },
    data: { checkOut: data.newCheckOut },
  });

  // Log the request
  const log = await prisma.auditLog.create({
    data: {
      bookingId: data.bookingId,
      action: "EXTEND_REQUEST",
      entity: "booking",
      entityId: data.bookingId,
      metadata: {
        newCheckOut: data.newCheckOut.toISOString(),
        reason: data.reason ?? "",
        requestedAt: new Date().toISOString(),
      },
    },
  });

  return { booking, log };
}

// ─── Add-on Requests ──────────────────────────────────────────────────────────

export type AddonType =
  | "laundry"
  | "extra_towels"
  | "breakfast"
  | "late_checkout"
  | "early_checkin"
  | "extra_bed"
  | "iron_board"
  | "room_service";

export type CreateAddonRequestData = {
  bookingId: string;
  addonType: AddonType;
  notes?: string;
  quantity?: number;
};

/**
 * Create an add-on request (stored as audit log)
 */
export async function createAddonRequest(data: CreateAddonRequestData) {
  return prisma.auditLog.create({
    data: {
      bookingId: data.bookingId,
      action: "ADDON_REQUEST",
      entity: "booking",
      entityId: data.bookingId,
      metadata: {
        addonType: data.addonType,
        notes: data.notes ?? "",
        quantity: data.quantity ?? 1,
        requestedAt: new Date().toISOString(),
      },
    },
  });
}

/**
 * Get all add-on requests for a guest's bookings
 */
export async function getGuestAddonRequests(guestId: string) {
  return prisma.auditLog.findMany({
    where: {
      booking: { guestId },
      action: "ADDON_REQUEST",
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingNumber: true,
          checkIn: true,
          checkOut: true,
          room: { select: { roomNumber: true, type: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ─── Guest Dashboard Stats ───────────────────────────────────────────────────

export type GuestDashboardStats = {
  totalStays: number;
  upcomingStays: number;
  pastStays: number;
  pendingDocuments: number;
  openComplaints: number;
};

/**
 * Get guest portal dashboard stats
 */
export async function getGuestDashboardStats(guestId: string) {
  const now = new Date();

  const [totalBookings, upcomingBookings, pendingDocs, openComplaints] =
    await Promise.all([
      prisma.booking.count({ where: { guestId } }),
      prisma.booking.count({
        where: { guestId, checkIn: { gte: now }, status: { in: ["CONFIRMED"] } },
      }),
      prisma.guestDocument.count({
        where: { guestId, verified: false },
      }),
      prisma.complaint.count({
        where: { booking: { guestId }, status: { in: ["OPEN", "IN_PROGRESS"] } },
      }),
    ]);

  const pastStays = await prisma.booking.count({
    where: { guestId, status: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
  });

  return {
    totalStays: totalBookings,
    upcomingStays: upcomingBookings,
    pastStays,
    pendingDocuments: pendingDocs,
    openComplaints,
  };
}

// ─── Front-office helpers ──────────────────────────────────────────────────

export type CreateGuestData = {
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  companyName?: string;
  notes?: string;
};

export async function createGuest(data: CreateGuestData) {
  return prisma.guest.create({ data });
}

export async function searchGuests(query: string) {
  const q = query.trim();
  return prisma.guest.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    },
    include: {
      bookings: {
        include: { room: { select: { roomNumber: true, type: true } } },
        orderBy: { checkIn: "desc" },
        take: 5,
      },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
}

export async function incrementStayCount(guestId: string) {
  return prisma.guest.update({
    where: { id: guestId },
    data: { stayCount: { increment: 1 } },
  });
}

export type GetGuestsOptions = {
  page?: number;
  perPage?: number;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'stayCount';
  sortOrder?: 'asc' | 'desc';
};

export async function getGuests(options: GetGuestsOptions = {}) {
  const {
    page = 1,
    perPage = 20,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = options;

  const skip = (page - 1) * perPage;

  const where = search
    ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
      ],
    }
    : {};

  const [guests, total] = await Promise.all([
    prisma.guest.findMany({
      where,
      include: {
        bookings: {
          include: { room: { select: { roomNumber: true, type: true } } },
          orderBy: { checkIn: 'desc' },
          take: 3,
        },
      },
      skip,
      take: perPage,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.guest.count({ where }),
  ]);

  return {
    guests,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}
