// apps/front-office/src/app/api/notifications/send/route.ts
// POST /api/notifications/send - Send notification

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@the-rooms/auth";
import { ok, created, unauthorized, forbidden, badRequest, serverError } from "@the-rooms/api/response";
import { sendNotification, sendSMS, sendWhatsApp, sendEmail } from "@the-rooms/db/queries/notificationQueries";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return unauthorized();
        }

        const userRole = session.user.role;
        if (!['ADMIN', 'SUPER_ADMIN', 'FRONT_OFFICE'].includes(userRole)) {
            return forbidden("You don't have permission to send notifications");
        }

        const body = await request.json();
        const { guestId, channel, templateId, data, phone, email, message, subject } = body;

        let result;

        if (guestId && channel && templateId) {
            // Send via template
            result = await sendNotification(guestId, channel, templateId, data || {});
        } else if (phone && message) {
            // Direct SMS
            result = await sendSMS(phone, message, templateId);
        } else if (phone && message && channel === 'WHATSAPP') {
            // Direct WhatsApp
            result = await sendWhatsApp(phone, message, templateId);
        } else if (email && subject && message) {
            // Direct Email
            result = await sendEmail(email, subject, message, templateId);
        } else {
            return badRequest("Invalid notification parameters");
        }

        return created({
            message: "Notification sent successfully",
            ...result,
        });
    } catch (error) {
        console.error("Error sending notification:", error);
        const message = error instanceof Error ? error.message : "Failed to send notification";
        if (message.includes('not found')) {
            return badRequest(message);
        }
        return serverError();
    }
}