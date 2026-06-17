// apps/admin/src/app/api/exceptions/route.ts
// Exceptions API - CRUD operations for operational exceptions

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ExceptionType = "OVERBOOKING" | "PAYMENT_MISMATCH" | "MISSING_DOCUMENT" | "PRICING_ERROR" | "DOUBLE_BOOKING";
type ExceptionSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
type ExceptionStatus = "OPEN" | "RESOLVED" | "ESCALATED" | "DISMISSED";

interface RelatedEntity {
    type: string;
    id: string;
    label: string;
}

interface Exception {
    id: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    status: ExceptionStatus;
    title: string;
    description: string;
    entityType: "BOOKING" | "ROOM" | "PAYMENT" | "GUEST";
    entityId: string;
    relatedEntities: RelatedEntity[];
    resolution: string | null;
    resolvedBy: string | null;
    resolvedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────────

const exceptions: Exception[] = [
    {
        id: "1",
        type: "OVERBOOKING",
        severity: "CRITICAL",
        status: "OPEN",
        title: "Room 203 double booked",
        description: "Room 203 has been booked for two different guests on the same dates (June 20-22).",
        entityType: "ROOM",
        entityId: "203",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240615-0001", label: "Booking BKN-20240615-0001" },
            { type: "BOOKING", id: "BKN-20240615-0002", label: "Booking BKN-20240615-0002" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "2",
        type: "PAYMENT_MISMATCH",
        severity: "HIGH",
        status: "OPEN",
        title: "Payment amount discrepancy",
        description: "Invoice amount is ₹15,000 but payment received is only ₹14,500. Missing ₹500.",
        entityType: "PAYMENT",
        entityId: "PAY-2024-0045",
        relatedEntities: [
            { type: "INVOICE", id: "INV-20240610-0003", label: "Invoice INV-20240610-0003" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "3",
        type: "MISSING_DOCUMENT",
        severity: "MEDIUM",
        status: "ESCALATED",
        title: "Guest ID verification pending",
        description: "Guest Arjun Sharma (Booking BKN-20240618-0008) has not submitted ID proof.",
        entityType: "GUEST",
        entityId: "GST-00234",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240618-0008", label: "Booking BKN-20240618-0008" },
        ],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "4",
        type: "DOUBLE_BOOKING",
        severity: "CRITICAL",
        status: "RESOLVED",
        title: "Room 305 double booking resolved",
        description: "Room 305 was accidentally assigned to two guests. One booking was moved to Room 307.",
        entityType: "ROOM",
        entityId: "305",
        relatedEntities: [
            { type: "BOOKING", id: "BKN-20240612-0005", label: "Original booking" },
            { type: "ROOM", id: "307", label: "New room assigned" },
        ],
        resolution: "Guest was moved to Room 307 at no additional cost. Original booking updated.",
        resolvedBy: "Admin User",
        resolvedAt: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

// ─── GET /api/exceptions ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") as ExceptionStatus | null;
        const type = searchParams.get("type") as ExceptionType | null;

        let filteredExceptions = exceptions;
        if (status) {
            filteredExceptions = filteredExceptions.filter((e) => e.status === status);
        }
        if (type) {
            filteredExceptions = filteredExceptions.filter((e) => e.type === type);
        }

        return NextResponse.json({ exceptions: filteredExceptions });
    } catch (error) {
        console.error("[EXCEPTIONS_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── POST /api/exceptions ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN" && role !== "FRONT_OFFICE") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { type, severity, title, description, entityType, entityId, relatedEntities } = body;

        if (!type || !title || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newException: Exception = {
            id: String(Date.now()),
            type,
            severity: severity || "MEDIUM",
            status: "OPEN",
            title,
            description,
            entityType: entityType || "BOOKING",
            entityId: entityId || "",
            relatedEntities: relatedEntities || [],
            resolution: null,
            resolvedBy: null,
            resolvedAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        exceptions.push(newException);

        return NextResponse.json({ exception: newException }, { status: 201 });
    } catch (error) {
        console.error("[EXCEPTION_CREATE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
