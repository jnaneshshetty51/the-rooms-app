import { NextRequest } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";
import { ok, badRequest, serverError } from "@the-rooms/api/response";
import { getPropertyIdFromSession } from "@the-rooms/api/middleware";
import { z } from "zod";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const UpdateSettingsSchema = z.object({
  hotelName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  lateCheckOutFee: z.number().optional(),
  earlyCheckInFee: z.number().optional(),
  extraGuestRateDaily: z.number().optional(),
  gstNumber: z.string().optional(),
  emailOnBooking: z.boolean().optional(),
  emailOnCancel: z.boolean().optional(),
  dailyReport: z.boolean().optional(),
  maintenanceAlerts: z.boolean().optional(),
  noShowChargeType: z.string().optional(),
  noShowChargeValue: z.number().optional(),
  noShowCutoffHour: z.number().optional(),
  noShowEnabled: z.boolean().optional(),
  earlyCheckinEnabled: z.boolean().optional(),
  earlyCheckinCutoffHour: z.number().optional(),
  earlyCheckinChargeType: z.string().optional(),
  lateCheckoutEnabled: z.boolean().optional(),
  lateCheckoutCutoffHour: z.number().optional(),
  lateCheckoutChargeType: z.string().optional(),
  lateCheckoutMaxHour: z.number().optional(),
  lateCheckoutFee: z.number().optional(),
  cancellationPolicy: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const propertyId = await getPropertyIdFromSession(session);
    if (!propertyId) {
      return badRequest("No property access found", "FORBIDDEN");
    }

    let settings = await db.hotelSettings.findUnique({
      where: { propertyId },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await db.hotelSettings.create({
        data: { propertyId },
      });
    }

    return ok({ settings });
  } catch (error) {
    console.error("Error fetching hotel settings:", error);
    return serverError("Failed to fetch settings", "INTERNAL_ERROR");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return badRequest("Unauthorized", "UNAUTHORIZED");
    }

    const role = (session.user as { role?: string }).role;
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return badRequest("Forbidden", "FORBIDDEN");
    }

    const propertyId = await getPropertyIdFromSession(session);
    if (!propertyId) {
      return badRequest("No property access found", "FORBIDDEN");
    }

    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(
        parsed.error.errors.map(e => e.message).join(', '),
        "VALIDATION_ERROR"
      );
    }

    const settings = await db.hotelSettings.upsert({
      where: { propertyId },
      update: parsed.data,
      create: {
        propertyId,
        ...parsed.data,
      },
    });

    return ok({ settings });
  } catch (error) {
    console.error("Error updating hotel settings:", error);
    return serverError("Failed to update settings", "INTERNAL_ERROR");
  }
}
