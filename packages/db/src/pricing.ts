// packages/db/src/pricing.ts
// Booking price calculation — fetches room + discount from DB, applies GST

import { prisma as db } from '@the-rooms/db';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  PRICING_CONFIG,
  calculateNights,
  shouldUseMonthlyRate,
} from './config';

export type PriceBreakdown = {
  baseAmount: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  extrasAmount: Prisma.Decimal;
  subtotal: Prisma.Decimal;
  cgst: Prisma.Decimal;
  sgst: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  nights: number;
  nightlyRate: Prisma.Decimal;
  bookingType: 'DAILY' | 'MONTHLY';
  rateLabel: string;
  extraGuestCharge: Prisma.Decimal;
};

/**
 * Calculate total price for a booking.
 * Uses monthly rates automatically for STUDIO rooms with >= 28 nights.
 * GST applied at 18% (9% CGST + 9% SGST) on accommodation base.
 * Extra guest charge: +₹500 per extra guest per night for DAILY only (not MONTHLY)
 */
export async function calculatePrice(
  roomId: string,
  checkIn: Date,
  checkOut: Date,
  guestsCount: number,
  bookingType: 'DAILY' | 'MONTHLY',
  discountCode?: string
): Promise<PriceBreakdown> {
  const room = await db.room.findUnique({ where: { id: roomId } });
  if (!room) throw new Error(`Room not found: ${roomId}`);

  const nights = calculateNights(checkIn, checkOut);

  let baseAmount: Prisma.Decimal;
  let rateLabel: string;
  const isMonthly = shouldUseMonthlyRate(bookingType, room.type, nights);

  if (isMonthly) {
    baseAmount = guestsCount > 1
      ? (room.monthlyPriceDouble ?? room.basePriceDouble)
      : (room.monthlyPriceSingle ?? room.basePriceSingle);
    rateLabel = 'Monthly';
  } else {
    baseAmount = guestsCount > 1 ? room.basePriceDouble : room.basePriceSingle;
    rateLabel = `Daily × ${nights} night${nights !== 1 ? 's' : ''}`;
  }

  // Total room cost before discount
  let subtotal = new Decimal(baseAmount.toNumber());
  if (!isMonthly) {
    subtotal = new Decimal(baseAmount.toNumber()).mul(nights);
  }

  // Extra guest charge: configurable via HotelSettings, DAILY only
  const hotelSettings = await db.hotelSettings.findUnique({ where: { id: 'default' } });
  const extraGuestRateDaily = hotelSettings?.extraGuestRateDaily
    ? hotelSettings.extraGuestRateDaily.toNumber()
    : PRICING_CONFIG.EXTRA_GUEST_RATE_DAILY;
  const extraGuestChargeValue = (!isMonthly && guestsCount > PRICING_CONFIG.FREE_GUESTS_COUNT)
    ? extraGuestRateDaily * (guestsCount - PRICING_CONFIG.FREE_GUESTS_COUNT) * nights
    : 0;
  let extraGuestCharge = new Decimal(extraGuestChargeValue);
  if (extraGuestChargeValue > 0) {
    subtotal = subtotal.add(extraGuestCharge);
    const extraGuests = guestsCount - PRICING_CONFIG.FREE_GUESTS_COUNT;
    rateLabel += ` (+₹${extraGuestRateDaily}/night × ${extraGuests} extra guest${extraGuests > 1 ? 's' : ''})`;
  }

  // Apply discount if code is valid
  let discountAmount = new Decimal(0);
  if (discountCode) {
    const discount = await db.discount.findUnique({ where: { code: discountCode } });
    if (discount && discount.isActive) {
      const now = new Date();
      const inRange =
        (!discount.validFrom || discount.validFrom <= now) &&
        (!discount.validTo || discount.validTo >= now);
      const underLimit = !discount.maxUses || discount.usedCount < discount.maxUses;
      const minNightsOk = nights >= (discount.minDays ?? 1);
      const maxNightsOk = !discount.maxDays || nights <= discount.maxDays;

      if (inRange && underLimit && minNightsOk && maxNightsOk) {
        discountAmount = subtotal.mul(discount.discountPercent.toNumber()).div(100);
        subtotal = subtotal.sub(discountAmount);
      }
    }
  }

  // Extras placeholder (add per-person/extra-bed logic here)
  const extrasAmount = new Decimal(0);

  // GST on accommodation (CGST + SGST split)
  const cgst = subtotal.mul(PRICING_CONFIG.GST_RATE / 2);
  const sgst = subtotal.mul(PRICING_CONFIG.GST_RATE / 2);
  const totalAmount = subtotal.add(cgst).add(sgst);

  const nightlyRate =
    isMonthly || nights === 0
      ? subtotal
      : subtotal.div(nights);

  return {
    baseAmount: new Decimal(baseAmount.toNumber()),
    discountAmount,
    extrasAmount,
    subtotal,
    cgst,
    sgst,
    totalAmount,
    nights,
    nightlyRate,
    bookingType,
    rateLabel,
    extraGuestCharge,
  };
}

/**
 * Format a Decimal to INR string
 */
export function formatINR(amount: Prisma.Decimal): string {
  return `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Alias so both naming conventions work
export { calculatePrice as calculateBookingPrice };
