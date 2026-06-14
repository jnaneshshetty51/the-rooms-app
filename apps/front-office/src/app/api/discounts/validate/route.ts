// apps/front-office/src/app/api/discounts/validate/route.ts
// GET /api/discounts/validate - Validate a discount code for a booking

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { validateDiscountCode } from "@the-rooms/db";
import { RoomType } from "@prisma/client";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const code = searchParams.get("code");
        const checkIn = searchParams.get("checkIn");
        const checkOut = searchParams.get("checkOut");
        const roomType = searchParams.get("roomType") as RoomType | null;
        const subtotal = searchParams.get("subtotal");

        if (!code) {
            return NextResponse.json({ error: "Discount code is required" }, { status: 400 });
        }

        if (!checkIn || !checkOut) {
            return NextResponse.json(
                { error: "checkIn and checkOut dates are required" },
                { status: 400 }
            );
        }

        const validation = await validateDiscountCode(code, {
            checkIn: new Date(checkIn),
            checkOut: new Date(checkOut),
            roomType: roomType ?? undefined,
            subtotal: subtotal ? parseFloat(subtotal) : undefined,
        });

        if (!validation.isValid) {
            return NextResponse.json(
                { valid: false, error: validation.error },
                { status: 200 }
            );
        }

        return NextResponse.json({
            valid: true,
            discount: {
                code: validation.discount?.code,
                name: validation.discount?.name,
                type: validation.discount?.type,
                value: validation.discount?.value,
            },
            discountAmount: validation.discountAmount,
        });
    } catch (error) {
        console.error("[Discount Validate GET] Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
