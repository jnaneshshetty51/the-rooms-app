// apps/admin/src/app/api/automation/rules/route.ts
// Automation Rules API - CRUD operations for automation rules

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";

// ─── Types ─────────────────────────────────────────────────────────────────────

type TriggerType = "BOOKING_CREATED" | "CHECK_IN" | "CHECK_OUT" | "NO_SHOW" | "PAYMENT_RECEIVED" | "SCHEDULE" | "COMPLAINT_LOGGED";
type ActionType = "SEND_SMS" | "SEND_EMAIL" | "UPDATE_STATUS" | "CREATE_INVOICE" | "NOTIFY_STAFF" | "BLOCK_ROOM";
type RuleStatus = "ACTIVE" | "PAUSED" | "DISABLED";

interface AutomationRule {
    id: string;
    name: string;
    description: string;
    trigger: TriggerType;
    action: ActionType;
    condition: string | null;
    config: Record<string, unknown>;
    status: RuleStatus;
    lastTriggered: string | null;
    triggerCount: number;
    createdAt: string;
    updatedAt: string;
}

// ─── In-Memory Store (Replace with Prisma DB queries) ─────────────────────────

let rules: AutomationRule[] = [
    {
        id: "1",
        name: "Auto Mark No-Show",
        description: "Automatically mark booking as no-show if guest doesn't check in by 2 PM",
        trigger: "SCHEDULE",
        action: "UPDATE_STATUS",
        condition: "booking.status === CONFIRMED && hoursSinceCheckIn > 14",
        config: { time: "14:00", days: 1 },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 12,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "2",
        name: "Check-in Reminder",
        description: "Send SMS reminder 24 hours before check-in",
        trigger: "SCHEDULE",
        action: "SEND_SMS",
        condition: null,
        config: { hoursBefore: 24, template: "checkin_reminder" },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 45,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "3",
        name: "Payment Confirmation",
        description: "Send payment confirmation SMS when payment is received",
        trigger: "PAYMENT_RECEIVED",
        action: "SEND_SMS",
        condition: null,
        config: { template: "payment_confirmation" },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 156,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "4",
        name: "Auto Generate Checkout Invoice",
        description: "Automatically generate invoice when guest checks out",
        trigger: "CHECK_OUT",
        action: "CREATE_INVOICE",
        condition: null,
        config: {},
        status: "PAUSED",
        lastTriggered: null,
        triggerCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: "5",
        name: "Complaint Escalation Alert",
        description: "Notify manager when high priority complaint is logged",
        trigger: "COMPLAINT_LOGGED",
        action: "NOTIFY_STAFF",
        condition: "complaint.priority === HIGH || complaint.priority === URGENT",
        config: { notifyRoles: ["MANAGER", "ADMIN"] },
        status: "ACTIVE",
        lastTriggered: new Date().toISOString(),
        triggerCount: 8,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

// ─── GET /api/automation/rules ─────────────────────────────────────────────────

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

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        let filteredRules = rules;
        if (status) {
            filteredRules = rules.filter((r) => r.status === status);
        }

        return NextResponse.json({ rules: filteredRules });
    } catch (error) {
        console.error("[AUTOMATION_RULES_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── POST /api/automation/rules ────────────────────────────────────────────────

export async function POST(request: NextRequest) {
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
        const { name, description, trigger, action, condition, config } = body;

        if (!name || !trigger || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newRule: AutomationRule = {
            id: String(Date.now()),
            name,
            description: description || "",
            trigger,
            action,
            condition: condition || null,
            config: config || {},
            status: "ACTIVE",
            lastTriggered: null,
            triggerCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        rules.push(newRule);

        return NextResponse.json({ rule: newRule }, { status: 201 });
    } catch (error) {
        console.error("[AUTOMATION_RULES_CREATE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
