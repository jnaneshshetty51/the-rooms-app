import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Look up guest by email from session
        const guest = await db.guest.findFirst({
            where: { email: session.user.email ?? "" },
        });

        if (!guest) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        // Get loyalty program settings
        const loyaltyProgram = await db.loyaltyProgram.findFirst({
            where: { propertyId: guest.propertyId ?? undefined },
        });

        // Get guest's loyalty points
        const guestLoyalty = await db.guestLoyalty.findUnique({
            where: { guestId: guest.id },
            include: {
                tier: true,
            },
        });

        // Get points history
        const pointsHistory = await db.loyaltyTransaction.findMany({
            where: { guestLoyaltyId: guestLoyalty?.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        // Calculate tier benefits
        const tierBenefits = getTierBenefits(guestLoyalty?.tier?.name ?? "BRONZE");

        return NextResponse.json({
            points: guestLoyalty?.points ?? 0,
            tier: guestLoyalty?.tier?.name ?? "BRONZE",
            tierDisplayName: guestLoyalty?.tier?.displayName ?? "Bronze Member",
            pointsToNextTier: calculatePointsToNextTier(guestLoyalty?.points ?? 0, guestLoyalty?.tier?.name ?? "BRONZE"),
            history: pointsHistory.map((t) => ({
                id: t.id,
                type: t.type,
                points: t.points,
                description: t.description,
                createdAt: t.createdAt,
            })),
            benefits: tierBenefits,
            programName: loyaltyProgram?.name ?? "The Rooms Rewards",
        });
    } catch (error) {
        console.error("Error fetching loyalty points:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function getTierBenefits(tierName: string) {
    const allBenefits = {
        BRONZE: [
            { name: "Earn 5 points per ₹100 spent", type: "earning" },
            { name: "Birthday discount (5% off)", type: "discount" },
            { name: "Early check-in (subject to availability)", type: "perk" },
        ],
        SILVER: [
            { name: "Earn 7 points per ₹100 spent", type: "earning" },
            { name: "Birthday discount (10% off)", type: "discount" },
            { name: "Early check-in (subject to availability)", type: "perk" },
            { name: "Late checkout (up to 1 PM)", type: "perk" },
            { name: "Room upgrade (subject to availability)", type: "perk" },
        ],
        GOLD: [
            { name: "Earn 10 points per ₹100 spent", type: "earning" },
            { name: "Birthday discount (15% off)", type: "discount" },
            { name: "Early check-in (guaranteed)", type: "perk" },
            { name: "Late checkout (up to 2 PM)", type: "perk" },
            { name: "Room upgrade (guaranteed)", type: "perk" },
            { name: "Welcome drink on arrival", type: "perk" },
        ],
        PLATINUM: [
            { name: "Earn 15 points per ₹100 spent", type: "earning" },
            { name: "Birthday discount (25% off)", type: "discount" },
            { name: "Guaranteed early check-in", type: "perk" },
            { name: "Guaranteed late checkout (up to 4 PM)", type: "perk" },
            { name: "Guaranteed room upgrade", type: "perk" },
            { name: "Welcome amenities", type: "perk" },
            { name: "Free breakfast for two", type: "perk" },
            { name: "Priority late checkout extension", type: "perk" },
        ],
    };

    return allBenefits[tierName as keyof typeof allBenefits] ?? allBenefits.BRONZE;
}

function calculatePointsToNextTier(currentPoints: number, currentTier: string): number {
    const tierThresholds: Record<string, number> = {
        BRONZE: 1000,
        SILVER: 5000,
        GOLD: 15000,
        PLATINUM: Infinity,
    };

    const nextTier: Record<string, string | null> = {
        BRONZE: "SILVER",
        SILVER: "GOLD",
        GOLD: "PLATINUM",
        PLATINUM: null,
    };

    const nextTierName = nextTier[currentTier];
    if (!nextTierName) return 0;

    const threshold = tierThresholds[nextTierName];
    return Math.max(0, threshold - currentPoints);
}