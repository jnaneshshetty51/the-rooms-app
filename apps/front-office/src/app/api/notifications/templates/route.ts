// apps/front-office/src/app/api/notifications/templates/route.ts
// GET /api/notifications/templates - List templates
// POST /api/notifications/templates - Create template

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, created, unauthorized, forbidden, badRequest, serverError } from "@the-rooms/api/response";
import { getNotificationTemplates, createNotificationTemplate } from "@the-rooms/db/queries/notificationQueries";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to view templates");
        }

        const { searchParams } = new URL(request.url);
        const triggerType = searchParams.get("triggerType") || undefined;

        const templates = await getNotificationTemplates(triggerType as any);

        return ok(templates);
    } catch (error) {
        console.error("Error fetching templates:", error);
        return serverError();
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
            return forbidden("You don't have permission to create templates");
        }

        const body = await request.json();
        const { name, channel, subject, body: templateBody, triggerType, delayMinutes } = body;

        if (!name || !channel || !templateBody || !triggerType) {
            return badRequest("name, channel, body, and triggerType are required");
        }

        const template = await createNotificationTemplate({
            name,
            channel,
            subject,
            body: templateBody,
            triggerType,
            delayMinutes,
        });

        return created({
            message: "Template created successfully",
            template,
        });
    } catch (error) {
        console.error("Error creating template:", error);
        return serverError();
    }
}