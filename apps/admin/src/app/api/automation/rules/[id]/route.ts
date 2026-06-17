// apps/admin/src/app/api/automation/rules/[id]/route.ts
// Automation Rules API - Individual rule operations

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

// ─── In-Memory Store Reference ────────────────────────────────────────────────
// Rules are stored in the parent route module
// In production, replace with Prisma queries
declare global {
    // eslint-disable-next-line no-var
    var __automationRules: AutomationRule[] | undefined;
}

// ─── GET /api/automation/rules/[id] ───────────────────────────────────────────

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const rule = global.__automationRules?.find((r) => r.id === id);

        if (!rule) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        return NextResponse.json({ rule });
    } catch (error) {
        console.error("[AUTOMATION_RULE_GET]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── PATCH /api/automation/rules/[id] ─────────────────────────────────────────

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { status, name, description, trigger, action, condition, config } = body;

        const ruleIndex = global.__automationRules?.findIndex((r) => r.id === id);

        if (!ruleIndex || ruleIndex === -1) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        const rule = global.__automationRules![ruleIndex];
        const updatedRule: AutomationRule = {
            ...rule,
            ...(status !== undefined && { status }),
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(trigger !== undefined && { trigger }),
            ...(action !== undefined && { action }),
            ...(condition !== undefined && { condition }),
            ...(config !== undefined && { config }),
            updatedAt: new Date().toISOString(),
        };

        global.__automationRules![ruleIndex] = updatedRule;

        return NextResponse.json({ rule: updatedRule });
    } catch (error) {
        console.error("[AUTOMATION_RULE_UPDATE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// ─── DELETE /api/automation/rules/[id] ─────────────────────────────────────────

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const role = (session.user as { role?: string }).role;
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const ruleIndex = global.__automationRules?.findIndex((r) => r.id === id);

        if (!ruleIndex || ruleIndex === -1) {
            return NextResponse.json({ error: "Rule not found" }, { status: 404 });
        }

        global.__automationRules!.splice(ruleIndex, 1);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[AUTOMATION_RULE_DELETE]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
