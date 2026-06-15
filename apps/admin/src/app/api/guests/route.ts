import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { getGuests } from "@the-rooms/db";
import { ok, serverError } from "@the-rooms/api";

// GET /api/guests - List all guests with pagination and search
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") ?? "1");
        const perPage = parseInt(searchParams.get("perPage") ?? "20");
        const search = searchParams.get("search") ?? undefined;
        const sortBy = (searchParams.get("sortBy") ?? "createdAt") as "name" | "createdAt" | "stayCount";
        const sortOrder = (searchParams.get("sortOrder") ?? "desc") as "asc" | "desc";

        const result = await getGuests({
            page,
            perPage,
            search,
            sortBy,
            sortOrder,
        });

        return ok(result);
    } catch (error) {
        console.error("Error fetching guests:", error);
        return serverError("Failed to fetch guests");
    }
}
