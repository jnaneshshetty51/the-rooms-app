// packages/db/pricing.ts
// Booking price calculation — fetches room + discount from DB, applies GST

export interface PricingResult {
  baseAmount: number;     // before discount + GST
  discountAmount: number; // flat discount applied
  totalAmount: number;    // final amount guest pays (incl. GST)
}

export async function calculateBookingPrice(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  guestsCount: number,
  bookingType: "DAILY" | "MONTHLY",
  discountCode?: string
): Promise<PricingResult> {
  // Dynamic import to avoid module resolution issues in Next.js bundler
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { db } = await import("@the-rooms/db");

  // ── Room lookup ─────────────────────────────────────────────────────────
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error("Room not found");

  // ── Night count ────────────────────────────────────────────────────────
  const nights = Math.max(
    1,
    Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
  );

  // ── Base price ─────────────────────────────────────────────────────────
  let baseAmount: number;
  if (bookingType === "MONTHLY") {
    const months = nights / 30;
    const monthlyRate =
      guestsCount <= 1
        ? Number(room.monthlyPriceSingle ?? 0)
        : Number(room.monthlyPriceDouble ?? 0);
    baseAmount = monthlyRate * months;
  } else {
    const nightlyRate =
      guestsCount <= 1
        ? Number(room.basePriceSingle)
        : Number(room.basePriceDouble);
    baseAmount = nightlyRate * nights;
  }

  // ── Discount ───────────────────────────────────────────────────────────
  let discountAmount = 0;
  let discountPercent = 0;

  if (discountCode) {
    const discount = await db.discount.findUnique({
      where: { code: discountCode },
    });
    if (
      discount &&
      discount.isActive &&
      (!discount.validFrom || discount.validFrom <= new Date()) &&
      (!discount.validTo || discount.validTo >= new Date()) &&
      (!discount.maxUses || discount.usedCount < discount.maxUses)
    ) {
      const minDays = discount.minDays ?? 1;
      const maxDays = discount.maxDays ?? Infinity;
      if (nights >= minDays && nights <= maxDays) {
        discountPercent = Number(discount.discountPercent);
        discountAmount = (baseAmount * discountPercent) / 100;
      }
    }
  }

  const afterDiscount = baseAmount - discountAmount;

  // ── GST (18% on accommodation) ─────────────────────────────────────────
  const gst = afterDiscount * 0.18;
  const totalAmount = afterDiscount + gst;

  return {
    baseAmount: Math.round(baseAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}
