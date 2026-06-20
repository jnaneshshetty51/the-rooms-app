import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { db } from "@the-rooms/db";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const guest = await db.guest.findFirst({
            where: { email: session.user.email ?? "" },
        });

        if (!guest) {
            return NextResponse.json({ error: "Guest not found" }, { status: 404 });
        }

        const loyaltyPoints = await db.loyaltyPoint.findUnique({
            where: { guestId: guest.id },
        });

        const pointsHistory = await db.loyaltyTransaction.findMany({
            where: { guestId: guest.id },
            orderBy: { createdAt: "desc" },
            take: 50,
        });

        const tier = loyaltyPoints?.currentTier ?? guest.loyaltyTier ?? "BRONZE";
        const points = loyaltyPoints?.currentBalance ?? 0;

        return NextResponse.json({
            points,
            tier,
            tierDisplayName: tierDisplayName(tier),
            pointsToNextTier: calculatePointsToNextTier(points, tier),
            history: pointsHistory.map((t) => ({
                id: t.id,
                type: t.type,
                points: t.points,
                description: t.description,
                createdAt: t.createdAt,
            })),
            benefits: getTierBenefits(tier),
            programName: "The Rooms Rewards",
        });
    } catch (error) {
        console.error("Error fetching loyalty points:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

function tierDisplayName(tier: string): string {
    const names: Record<string, string> = { BRONZE: "Bronze Member", SILVER: "Silver Member", GOLD: "Gold Member", PLATINUM: "Platinum Member" };
    return names[tier] ?? "Bronze Member";
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
        ],
    };
    return allBenefits[tierName as keyof typeof allBenefits] ?? allBenefits.BRONZE;
}

function calculatePointsToNextTier(currentPoints: number, currentTier: string): number {
    const thresholds: Record<string, number> = { SILVER: 1000, GOLD: 5000, PLATINUM: 15000 };
    const next: Record<string, string | null> = { BRONZE: "SILVER", SILVER: "GOLD", GOLD: "PLATINUM", PLATINUM: null };
    const nextTierName = next[currentTier];
    if (!nextTierName) return 0;
    return Math.max(0, (thresholds[nextTierName] ?? 0) - currentPoints);
}
