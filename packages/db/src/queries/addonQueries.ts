// packages/db/src/queries/addonQueries.ts
// Query helpers for BookingAddon model

import prisma from '../index';
import { Prisma, AddonType } from '@prisma/client';
import { Decimal } from 'decimal.js';

// ─── Predefined Add-on Types with Standard Prices ────────────────────────────
// Prices are in INR (per unit/quantity)

export interface AddonTypeInfo {
    type: AddonType;
    name: string;
    description: string;
    defaultPrice: number;
    unit: string;
    taxable: boolean;
}

export const ADDON_TYPES: Record<AddonType, AddonTypeInfo> = {
    FB: {
        type: AddonType.FB,
        name: 'Food & Beverage',
        description: 'Food and beverage services',
        defaultPrice: 0,
        unit: 'item',
        taxable: true,
    },
    LAUNDRY: {
        type: AddonType.LAUNDRY,
        name: 'Laundry',
        description: 'Laundry and dry cleaning services',
        defaultPrice: 50,
        unit: 'piece',
        taxable: true,
    },
    SPA: {
        type: AddonType.SPA,
        name: 'Spa',
        description: 'Spa and wellness services',
        defaultPrice: 1500,
        unit: 'session',
        taxable: true,
    },
    MINIBAR: {
        type: AddonType.MINIBAR,
        name: 'Mini Bar',
        description: 'Mini bar items consumed',
        defaultPrice: 100,
        unit: 'item',
        taxable: true,
    },
    RESTAURANT: {
        type: AddonType.RESTAURANT,
        name: 'Restaurant',
        description: 'Restaurant dining charges',
        defaultPrice: 0,
        unit: 'order',
        taxable: true,
    },
    TRANSPORT: {
        type: AddonType.TRANSPORT,
        name: 'Transport',
        description: 'Transportation services',
        defaultPrice: 500,
        unit: 'trip',
        taxable: true,
    },
    ROOM_SERVICE: {
        type: AddonType.ROOM_SERVICE,
        name: 'Room Service',
        description: 'In-room dining service',
        defaultPrice: 200,
        unit: 'order',
        taxable: true,
    },
    OTHER: {
        type: AddonType.OTHER,
        name: 'Other',
        description: 'Miscellaneous charges',
        defaultPrice: 0,
        unit: 'item',
        taxable: true,
    },
};

// GST rate (currently 18% - 9% CGST + 9% SGST)
const GST_RATE = 0.18;
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

export type CreateAddonData = {
    bookingId: string;
    type: AddonType;
    description: string;
    amount: number;
    quantity?: number;
    serviceDate: Date;
    addedById?: string;
};

export type UpdateAddonData = {
    type?: AddonType;
    description?: string;
    amount?: number;
    quantity?: number;
    serviceDate?: Date;
};

/**
 * Calculate GST for an add-on charge
 */
export function calculateAddonGST(amount: number, quantity: number = 1): { cgst: number; sgst: number; total: number } {
    const subtotal = amount * quantity;
    const cgst = new Decimal(subtotal).times(CGST_RATE).toNumber();
    const sgst = new Decimal(subtotal).times(SGST_RATE).toNumber();
    const total = new Decimal(subtotal).plus(cgst).plus(sgst).toNumber();
    return { cgst, sgst, total };
}

/**
 * Get all add-ons for a booking
 */
export async function getAddonsByBooking(bookingId: string) {
    return prisma.bookingAddon.findMany({
        where: { bookingId },
        include: {
            addedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { serviceDate: 'desc' },
    });
}

/**
 * Get add-ons by booking grouped by type
 */
export async function getAddonsByBookingGrouped(bookingId: string) {
    const addons = await getAddonsByBooking(bookingId);

    // Group by type
    const grouped: Record<AddonType, typeof addons> = {} as Record<AddonType, typeof addons>;
    for (const addon of addons) {
        if (!grouped[addon.type]) {
            grouped[addon.type] = [];
        }
        grouped[addon.type].push(addon);
    }

    return grouped;
}

/**
 * Get addon totals by booking
 */
export async function getAddonTotalsByBooking(bookingId: string) {
    const addons = await getAddonsByBooking(bookingId);

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let grandTotal = 0;

    for (const addon of addons) {
        subtotal += addon.amount.toNumber() * addon.quantity;
        totalCgst += addon.cgst.toNumber();
        totalSgst += addon.sgst.toNumber();
        grandTotal += addon.totalAmount.toNumber();
    }

    return {
        subtotal,
        cgst: totalCgst,
        sgst: totalSgst,
        total: grandTotal,
        count: addons.length,
    };
}

/**
 * Get a single addon by ID
 */
export async function getAddonById(id: string) {
    return prisma.bookingAddon.findUnique({
        where: { id },
        include: {
            addedBy: { select: { id: true, name: true, email: true } },
            booking: {
                include: {
                    guest: true,
                    room: true,
                },
            },
        },
    });
}

/**
 * Create a new addon
 */
export async function createAddon(data: CreateAddonData) {
    const quantity = data.quantity ?? 1;
    const { cgst, sgst, total } = calculateAddonGST(data.amount, quantity);

    return prisma.bookingAddon.create({
        data: {
            bookingId: data.bookingId,
            type: data.type,
            description: data.description,
            amount: new Prisma.Decimal(data.amount),
            quantity,
            serviceDate: data.serviceDate,
            addedById: data.addedById,
            cgst: new Prisma.Decimal(cgst),
            sgst: new Prisma.Decimal(sgst),
            totalAmount: new Prisma.Decimal(total),
        },
        include: {
            addedBy: { select: { id: true, name: true, email: true } },
        },
    });
}

/**
 * Update an addon
 */
export async function updateAddon(id: string, data: UpdateAddonData) {
    const existing = await prisma.bookingAddon.findUnique({ where: { id } });
    if (!existing) {
        throw new Error(`Addon not found: ${id}`);
    }

    const amount = data.amount ?? existing.amount.toNumber();
    const quantity = data.quantity ?? existing.quantity;
    const { cgst, sgst, total } = calculateAddonGST(amount, quantity);

    return prisma.bookingAddon.update({
        where: { id },
        data: {
            ...(data.type && { type: data.type }),
            ...(data.description && { description: data.description }),
            ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
            ...(data.quantity !== undefined && { quantity: data.quantity }),
            ...(data.serviceDate && { serviceDate: data.serviceDate }),
            cgst: new Prisma.Decimal(cgst),
            sgst: new Prisma.Decimal(sgst),
            totalAmount: new Prisma.Decimal(total),
        },
    });
}

/**
 * Delete an addon
 */
export async function deleteAddon(id: string) {
    return prisma.bookingAddon.delete({
        where: { id },
    });
}

/**
 * Get all addon types with their default prices
 */
export function getAddonTypes() {
    return Object.values(ADDON_TYPES);
}

/**
 * Get addon type info
 */
export function getAddonTypeInfo(type: AddonType): AddonTypeInfo | undefined {
    return ADDON_TYPES[type];
}

/**
 * Update booking extras amount when addons change
 */
export async function syncBookingExtrasAmount(bookingId: string) {
    const totals = await getAddonTotalsByBooking(bookingId);

    return prisma.booking.update({
        where: { id: bookingId },
        data: {
            extrasAmount: new Prisma.Decimal(totals.total),
        },
    });
}

/**
 * Get folio summary for a booking (room charges + addons)
 */
export async function getFolioSummary(bookingId: string) {
    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            roomCharges: {
                orderBy: { chargeDate: 'asc' },
            },
            addons: {
                orderBy: { serviceDate: 'asc' },
            },
        },
    });

    if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
    }

    // Calculate room charges total
    let roomChargesSubtotal = 0;
    let roomChargesCgst = 0;
    let roomChargesSgst = 0;
    let roomChargesTotal = 0;

    for (const charge of booking.roomCharges) {
        roomChargesSubtotal += charge.subtotal.toNumber();
        roomChargesCgst += charge.cgst.toNumber();
        roomChargesSgst += charge.sgst.toNumber();
        roomChargesTotal += charge.totalAmount.toNumber();
    }

    // Calculate addon totals by category
    const addonTotalsByType: Record<AddonType, { subtotal: number; cgst: number; sgst: number; total: number; count: number }> = {} as Record<AddonType, { subtotal: number; cgst: number; sgst: number; total: number; count: number }>;

    for (const addon of booking.addons) {
        if (!addonTotalsByType[addon.type]) {
            addonTotalsByType[addon.type] = { subtotal: 0, cgst: 0, sgst: 0, total: 0, count: 0 };
        }
        addonTotalsByType[addon.type].subtotal += addon.amount.toNumber() * addon.quantity;
        addonTotalsByType[addon.type].cgst += addon.cgst.toNumber();
        addonTotalsByType[addon.type].sgst += addon.sgst.toNumber();
        addonTotalsByType[addon.type].total += addon.totalAmount.toNumber();
        addonTotalsByType[addon.type].count += 1;
    }

    // Grand totals
    const addonTotals = await getAddonTotalsByBooking(bookingId);

    return {
        booking: {
            id: booking.id,
            bookingNumber: booking.bookingNumber,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            baseAmount: booking.baseAmount.toNumber(),
            discountAmount: booking.discountAmount.toNumber(),
        },
        roomCharges: {
            items: booking.roomCharges,
            subtotal: roomChargesSubtotal,
            cgst: roomChargesCgst,
            sgst: roomChargesSgst,
            total: roomChargesTotal,
        },
        addons: {
            byType: addonTotalsByType,
            items: booking.addons,
            subtotal: addonTotals.subtotal,
            cgst: addonTotals.cgst,
            sgst: addonTotals.sgst,
            total: addonTotals.total,
            count: addonTotals.count,
        },
        grandTotal: {
            roomCharges: roomChargesTotal,
            addons: addonTotals.total,
            total: roomChargesTotal + addonTotals.total,
        },
    };
}
