// apps/admin/src/app/api/settings/pricing/route.ts
// Pricing Rules Settings API

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

// ─── GET /api/settings/pricing ─────────────────────────────────────────────
// Get pricing rules settings

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Get or create pricing settings
        let settings = await db.hotelSettings.findUnique({
            where: { id: "default" },
        });

        if (!settings) {
            settings = await db.hotelSettings.create({
                data: { id: "default" },
            });
        }

        // Extract pricing-specific settings
        const pricingSettings = {
            // Base pricing
            basePricing: {
                defaultDailyRate: (settings as any).defaultDailyRate || 2000,
                defaultMonthlyRate: (settings as any).defaultMonthlyRate || 45000,
                minimumNightlyRate: (settings as any).minimumNightlyRate || 500,
                extraGuestCharge: (settings as any).extraGuestRateDaily || 500,
                extraBedCharge: (settings as any).extraBedCharge || 300,
            },
            // Weekend pricing
            weekendPricing: {
                enabled: (settings as any).weekendPricingEnabled ?? false,
                fridayMarkupPercent: (settings as any).fridayMarkupPercent || 10,
                saturdayMarkupPercent: (settings as any).saturdayMarkupPercent || 15,
                sundayMarkupPercent: (settings as any).sundayMarkupPercent || 10,
                applyFridayToThursday: (settings as any).applyFridayToThursday ?? false, // Extended weekend (Fri-Chu)
            },
            // Length of stay discounts
            losDiscounts: {
                enabled: (settings as any).losDiscountsEnabled ?? true,
                weeklyDiscountPercent: (settings as any).weeklyDiscountPercent || 5,
                monthlyDiscountPercent: (settings as any).monthlyDiscountPercent || 15,
                quarterlyDiscountPercent: (settings as any).quarterlyDiscountPercent || 20,
                customDiscounts: (settings as any).customLosDiscounts || [], // Array of {minNights, maxNights, discountPercent}
            },
            // Seasonal pricing
            seasonalPricing: {
                enabled: (settings as any).seasonalPricingEnabled ?? true,
                peakSeasonMonths: (settings as any).peakSeasonMonths || [4, 5, 10, 11],
                peakSeasonMarkupPercent: (settings as any).peakSeasonMarkupPercent || 25,
                offSeasonMonths: (settings as any).offSeasonMonths || [6, 7, 8],
                offSeasonDiscountPercent: (settings as any).offSeasonDiscountPercent || 10,
            },
            // Corporate rates
            corporateRates: {
                enabled: (settings as any).corporateRatesEnabled ?? true,
                defaultCorporateDiscount: (settings as any).defaultCorporateDiscount || 15,
                allowNegotiation: (settings as any).allowRateNegotiation ?? true,
                minimumCorporateRate: (settings as any).minimumCorporateRate || 0.7, // Min 70% of base rate
            },
            // Loyalty discounts
            loyaltyDiscounts: {
                enabled: (settings as any).loyaltyDiscountsEnabled ?? true,
                tiers: (settings as any).loyaltyTiers || [
                    { name: "Silver", staysRequired: 3, discountPercent: 5 },
                    { name: "Gold", staysRequired: 7, discountPercent: 10 },
                    { name: "Platinum", staysRequired: 15, discountPercent: 15 },
                ],
            },
            // Last minute / Early bird
            dynamicPricing: {
                lastMinuteEnabled: (settings as any).lastMinutePricingEnabled ?? false,
                lastMinuteThresholdHours: (settings as any).lastMinuteThresholdHours || 24,
                lastMinuteDiscountPercent: (settings as any).lastMinuteDiscountPercent || 10,
                earlyBirdEnabled: (settings as any).earlyBirdPricingEnabled ?? true,
                earlyBirdThresholdDays: (settings as any).earlyBirdThresholdDays || 30,
                earlyBirdDiscountPercent: (settings as any).earlyBirdDiscountPercent || 15,
            },
        };

        return NextResponse.json({ settings: pricingSettings });
    } catch (error) {
        console.error("Error fetching pricing settings:", error);
        return NextResponse.json({ error: "Failed to fetch pricing settings" }, { status: 500 });
    }
}

// ─── PATCH /api/settings/pricing ─────────────────────────────────────────────
// Update pricing rules settings

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const updateData: any = {};

        // Base pricing
        if (body.basePricing) {
            if (body.basePricing.defaultDailyRate !== undefined) updateData.defaultDailyRate = parseFloat(body.basePricing.defaultDailyRate) || 2000;
            if (body.basePricing.defaultMonthlyRate !== undefined) updateData.defaultMonthlyRate = parseFloat(body.basePricing.defaultMonthlyRate) || 45000;
            if (body.basePricing.minimumNightlyRate !== undefined) updateData.minimumNightlyRate = parseFloat(body.basePricing.minimumNightlyRate) || 500;
            if (body.basePricing.extraGuestCharge !== undefined) updateData.extraGuestRateDaily = parseFloat(body.basePricing.extraGuestCharge) || 500;
            if (body.basePricing.extraBedCharge !== undefined) updateData.extraBedCharge = parseFloat(body.basePricing.extraBedCharge) || 300;
        }

        // Weekend pricing
        if (body.weekendPricing) {
            if (body.weekendPricing.enabled !== undefined) updateData.weekendPricingEnabled = body.weekendPricing.enabled;
            if (body.weekendPricing.fridayMarkupPercent !== undefined) updateData.fridayMarkupPercent = parseFloat(body.weekendPricing.fridayMarkupPercent) || 10;
            if (body.weekendPricing.saturdayMarkupPercent !== undefined) updateData.saturdayMarkupPercent = parseFloat(body.weekendPricing.saturdayMarkupPercent) || 15;
            if (body.weekendPricing.sundayMarkupPercent !== undefined) updateData.sundayMarkupPercent = parseFloat(body.weekendPricing.sundayMarkupPercent) || 10;
            if (body.weekendPricing.applyFridayToThursday !== undefined) updateData.applyFridayToThursday = body.weekendPricing.applyFridayToThursday;
        }

        // LOS discounts
        if (body.losDiscounts) {
            if (body.losDiscounts.enabled !== undefined) updateData.losDiscountsEnabled = body.losDiscounts.enabled;
            if (body.losDiscounts.weeklyDiscountPercent !== undefined) updateData.weeklyDiscountPercent = parseFloat(body.losDiscounts.weeklyDiscountPercent) || 5;
            if (body.losDiscounts.monthlyDiscountPercent !== undefined) updateData.monthlyDiscountPercent = parseFloat(body.losDiscounts.monthlyDiscountPercent) || 15;
            if (body.losDiscounts.quarterlyDiscountPercent !== undefined) updateData.quarterlyDiscountPercent = parseFloat(body.losDiscounts.quarterlyDiscountPercent) || 20;
            if (body.losDiscounts.customDiscounts !== undefined) updateData.customLosDiscounts = body.losDiscounts.customDiscounts;
        }

        // Seasonal pricing
        if (body.seasonalPricing) {
            if (body.seasonalPricing.enabled !== undefined) updateData.seasonalPricingEnabled = body.seasonalPricing.enabled;
            if (body.seasonalPricing.peakSeasonMonths !== undefined) updateData.peakSeasonMonths = body.seasonalPricing.peakSeasonMonths;
            if (body.seasonalPricing.peakSeasonMarkupPercent !== undefined) updateData.peakSeasonMarkupPercent = parseFloat(body.seasonalPricing.peakSeasonMarkupPercent) || 25;
            if (body.seasonalPricing.offSeasonMonths !== undefined) updateData.offSeasonMonths = body.seasonalPricing.offSeasonMonths;
            if (body.seasonalPricing.offSeasonDiscountPercent !== undefined) updateData.offSeasonDiscountPercent = parseFloat(body.seasonalPricing.offSeasonDiscountPercent) || 10;
        }

        // Corporate rates
        if (body.corporateRates) {
            if (body.corporateRates.enabled !== undefined) updateData.corporateRatesEnabled = body.corporateRates.enabled;
            if (body.corporateRates.defaultCorporateDiscount !== undefined) updateData.defaultCorporateDiscount = parseFloat(body.corporateRates.defaultCorporateDiscount) || 15;
            if (body.corporateRates.allowNegotiation !== undefined) updateData.allowRateNegotiation = body.corporateRates.allowNegotiation;
            if (body.corporateRates.minimumCorporateRate !== undefined) updateData.minimumCorporateRate = parseFloat(body.corporateRates.minimumCorporateRate) || 0.7;
        }

        // Loyalty discounts
        if (body.loyaltyDiscounts) {
            if (body.loyaltyDiscounts.enabled !== undefined) updateData.loyaltyDiscountsEnabled = body.loyaltyDiscounts.enabled;
            if (body.loyaltyDiscounts.tiers !== undefined) updateData.loyaltyTiers = body.loyaltyDiscounts.tiers;
        }

        // Dynamic pricing
        if (body.dynamicPricing) {
            if (body.dynamicPricing.lastMinuteEnabled !== undefined) updateData.lastMinutePricingEnabled = body.dynamicPricing.lastMinuteEnabled;
            if (body.dynamicPricing.lastMinuteThresholdHours !== undefined) updateData.lastMinuteThresholdHours = parseInt(body.dynamicPricing.lastMinuteThresholdHours) || 24;
            if (body.dynamicPricing.lastMinuteDiscountPercent !== undefined) updateData.lastMinuteDiscountPercent = parseFloat(body.dynamicPricing.lastMinuteDiscountPercent) || 10;
            if (body.dynamicPricing.earlyBirdEnabled !== undefined) updateData.earlyBirdPricingEnabled = body.dynamicPricing.earlyBirdEnabled;
            if (body.dynamicPricing.earlyBirdThresholdDays !== undefined) updateData.earlyBirdThresholdDays = parseInt(body.dynamicPricing.earlyBirdThresholdDays) || 30;
            if (body.dynamicPricing.earlyBirdDiscountPercent !== undefined) updateData.earlyBirdDiscountPercent = parseFloat(body.dynamicPricing.earlyBirdDiscountPercent) || 15;
        }

        // Upsert settings
        const settings = await db.hotelSettings.upsert({
            where: { id: "default" },
            update: updateData,
            create: {
                id: "default",
                ...updateData,
            },
        });

        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating pricing settings:", error);
        return NextResponse.json({ error: "Failed to update pricing settings" }, { status: 500 });
    }
}
