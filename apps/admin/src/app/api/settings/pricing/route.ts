// apps/admin/src/app/api/settings/pricing/route.ts
// Pricing Rules Settings API

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

const DEFAULT_PRICING_SETTINGS = {
    basePricing: {
        defaultDailyRate: 2000,
        defaultMonthlyRate: 45000,
        minimumNightlyRate: 500,
        extraGuestCharge: 500,
        extraBedCharge: 300,
    },
    weekendPricing: {
        enabled: false,
        fridayMarkupPercent: 10,
        saturdayMarkupPercent: 15,
        sundayMarkupPercent: 10,
        applyFridayToThursday: false,
    },
    losDiscounts: {
        enabled: true,
        weeklyDiscountPercent: 5,
        monthlyDiscountPercent: 15,
        quarterlyDiscountPercent: 20,
        customDiscounts: [] as unknown[],
    },
    seasonalPricing: {
        enabled: true,
        peakSeasonMonths: [4, 5, 10, 11],
        peakSeasonMarkupPercent: 25,
        offSeasonMonths: [6, 7, 8],
        offSeasonDiscountPercent: 10,
    },
    corporateRates: {
        enabled: true,
        defaultCorporateDiscount: 15,
        allowNegotiation: true,
        minimumCorporateRate: 0.7,
    },
    loyaltyDiscounts: {
        enabled: true,
        tiers: [
            { name: "Silver", staysRequired: 3, discountPercent: 5 },
            { name: "Gold", staysRequired: 7, discountPercent: 10 },
            { name: "Platinum", staysRequired: 15, discountPercent: 15 },
        ],
    },
    dynamicPricing: {
        lastMinuteEnabled: false,
        lastMinuteThresholdHours: 24,
        lastMinuteDiscountPercent: 10,
        earlyBirdEnabled: true,
        earlyBirdThresholdDays: 30,
        earlyBirdDiscountPercent: 15,
    },
};

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return NextResponse.json({ settings: DEFAULT_PRICING_SETTINGS });
    } catch (error) {
        console.error("Error fetching pricing settings:", error);
        return NextResponse.json({ error: "Failed to fetch pricing settings" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const body = await request.json();
        const settings = { ...DEFAULT_PRICING_SETTINGS, ...body };
        return NextResponse.json({ settings });
    } catch (error) {
        console.error("Error updating pricing settings:", error);
        return NextResponse.json({ error: "Failed to update pricing settings" }, { status: 500 });
    }
}
