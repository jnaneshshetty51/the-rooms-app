// apps/admin/src/app/api/quick-actions/stats/route.ts
// Quick Actions Stats API - Real-time stats for quick action buttons

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import prisma from "@the-rooms/db";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Parallel queries for stats
        const [
            todayCheckIns,
            todayCheckOuts,
            pendingHousekeeping,
            openComplaints,
            maintenanceIssues,
            pendingPayments,
            pendingDocuments,
            openExceptions,
        ] = await Promise.all([
            // Today's check-ins count
            prisma.booking.count({
                where: {
                    checkIn: { gte: today, lt: tomorrow },
                    status: { in: ["CONFIRMED"] },
                },
            }),

            // Today's check-outs count
            prisma.booking.count({
                where: {
                    checkOut: { gte: today, lt: tomorrow },
                    status: { in: ["CONFIRMED", "CHECKED_IN"] },
                },
            }),

            // Pending housekeeping tasks
            prisma.housekeepingTask.count({
                where: {
                    status: { in: ["PENDING", "IN_PROGRESS"] },
                },
            }),

            // Open complaints
            prisma.complaint.count({
                where: {
                    status: { in: ["OPEN", "IN_PROGRESS"] },
                },
            }),

            // Maintenance issues
            prisma.roomMaintenance.count({
                where: {
                    status: { in: ["REPORTED", "IN_PROGRESS"] },
                },
            }),

            // Pending payments (bookings with payment status PENDING or PARTIAL)
            prisma.booking.count({
                where: {
                    paymentStatus: { in: ["PENDING", "PARTIAL"] },
                    status: { notIn: ["CANCELLED"] },
                },
            }),

            // Bookings with pending documents
            prisma.booking.count({
                where: {
                    status: { in: ["CONFIRMED"] },
                    checkIn: { gte: today },
                    guest: {
                        documents: {
                            none: {},
                        },
                    },
                },
            }),

            // Open exceptions (if Exception model exists, otherwise 0)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (prisma as any).exception?.count?.({
                where: { status: { in: ["OPEN", "ESCALATED"] } },
            }) ?? Promise.resolve(0),
        ]);

        // Active automation rules count
        const activeRules = 5; // Placeholder - would come from automation rules table

        return NextResponse.json({
            stats: {
                todayCheckIns,
                todayCheckOuts,
                pendingHousekeeping,
                openComplaints,
                maintenanceIssues,
                pendingPayments,
                pendingDocuments,
                openExceptions,
                activeRules,
            },
        });
    } catch (error) {
        console.error("[QUICK_ACTIONS_STATS_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
