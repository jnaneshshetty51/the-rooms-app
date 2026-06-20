import { NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { mockCashManagementData } from "./_data";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        return NextResponse.json(mockCashManagementData);
    } catch (error) {
        console.error("Error fetching cash management data:", error);
        return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }
}
