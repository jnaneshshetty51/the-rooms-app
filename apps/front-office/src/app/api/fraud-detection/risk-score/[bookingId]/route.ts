import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getFraudRiskScore } from "@the-rooms/db";

// GET /api/fraud-detection/risk-score/[bookingId] - Get risk score for a booking
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { bookingId } = await params;
        const riskScore = await getFraudRiskScore(bookingId);

        return NextResponse.json(riskScore);
    } catch (error) {
        console.error("Error calculating fraud risk score:", error);
        if (error instanceof Error && error.message === 'Booking not found') {
            return NextResponse.json({ error: "Booking not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to calculate risk score" }, { status: 500 });
    }
}
