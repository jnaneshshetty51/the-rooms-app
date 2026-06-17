// packages/db/src/queries/notificationQueries.ts
// SMS/WhatsApp/Email Notification Queries

import prisma from '../index';
import { NotificationChannel, NotificationStatus, NotificationTrigger } from '@prisma/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationData = {
    phone?: string;
    email?: string;
    message: string;
    subject?: string;
    templateId?: string;
    channel: NotificationChannel;
    entityType?: string;
    entityId?: string;
    scheduledAt?: Date;
};

export type NotificationFilters = {
    channel?: NotificationChannel;
    status?: NotificationStatus;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    perPage?: number;
};

// ── Send Notifications ─────────────────────────────────────────────────────────

/**
 * Send SMS notification (simulated - real implementation would call SMS gateway)
 */
export async function sendSMS(
    phone: string,
    message: string,
    templateId?: string
): Promise<{ id: string; status: string }> {
    // In production, this would call an SMS gateway like Twilio, MSG91, etc.
    const log = await prisma.notificationLog.create({
        data: {
            channel: 'SMS',
            recipient: phone,
            templateId,
            body: message,
            status: 'SENT',
            sentAt: new Date(),
        },
    });

    // Simulate sending
    console.log(`[SMS] Sending to ${phone}: ${message}`);

    return { id: log.id, status: 'SENT' };
}

/**
 * Send WhatsApp notification (simulated - real implementation would call WhatsApp API)
 */
export async function sendWhatsApp(
    phone: string,
    message: string,
    templateId?: string
): Promise<{ id: string; status: string }> {
    // In production, this would call WhatsApp Business API
    const log = await prisma.notificationLog.create({
        data: {
            channel: 'WHATSAPP',
            recipient: phone,
            templateId,
            body: message,
            status: 'SENT',
            sentAt: new Date(),
        },
    });

    // Simulate sending
    console.log(`[WhatsApp] Sending to ${phone}: ${message}`);

    return { id: log.id, status: 'SENT' };
}

/**
 * Send Email notification (simulated - real implementation would call email service)
 */
export async function sendEmail(
    email: string,
    subject: string,
    body: string,
    templateId?: string
): Promise<{ id: string; status: string }> {
    // In production, this would call an email service like SendGrid, Resend, etc.
    const log = await prisma.notificationLog.create({
        data: {
            channel: 'EMAIL',
            recipient: email,
            templateId,
            subject,
            body,
            status: 'SENT',
            sentAt: new Date(),
        },
    });

    // Simulate sending
    console.log(`[Email] Sending to ${email}: ${subject}`);

    return { id: log.id, status: 'SENT' };
}

/**
 * Send notification via specified channel
 */
export async function sendNotification(
    guestId: string,
    channel: NotificationChannel,
    templateId: string,
    data: Record<string, string>
): Promise<{ id: string; status: string }> {
    // Get guest info
    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
    });

    if (!guest) {
        throw new Error('Guest not found');
    }

    // Get template
    const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId },
    });

    if (!template) {
        throw new Error('Template not found');
    }

    // Replace placeholders in body and subject
    let body = template.body;
    let subject = template.subject;

    if (data) {
        Object.entries(data).forEach(([key, value]) => {
            body = body.replace(new RegExp(`{{${key}}}`, 'g'), value);
            if (subject) {
                subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
            }
        });
    }

    // Send based on channel
    let result;
    switch (channel) {
        case 'SMS':
            if (!guest.phone) throw new Error('Guest phone not found');
            result = await sendSMS(guest.phone, body, templateId);
            break;
        case 'WHATSAPP':
            if (!guest.phone) throw new Error('Guest phone not found');
            result = await sendWhatsApp(guest.phone, body, templateId);
            break;
        case 'EMAIL':
            if (!guest.email) throw new Error('Guest email not found');
            result = await sendEmail(guest.email, subject || '', body, templateId);
            break;
        default:
            throw new Error(`Unsupported channel: ${channel}`);
    }

    return result;
}

// ── Template Management ───────────────────────────────────────────────────────

/**
 * Get notification templates by trigger type
 */
export async function getNotificationTemplates(triggerType?: NotificationTrigger) {
    const where = triggerType ? { triggerType, isActive: true } : { isActive: true };

    return prisma.notificationTemplate.findMany({
        where,
        orderBy: { name: 'asc' },
    });
}

/**
 * Get a specific template by ID
 */
export async function getTemplateById(templateId: string) {
    return prisma.notificationTemplate.findUnique({
        where: { id: templateId },
    });
}

/**
 * Create a notification template
 */
export async function createNotificationTemplate(data: {
    name: string;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    triggerType: NotificationTrigger;
    delayMinutes?: number;
    propertyId?: string;
}) {
    return prisma.notificationTemplate.create({
        data: {
            name: data.name,
            channel: data.channel,
            subject: data.subject,
            body: data.body,
            triggerType: data.triggerType,
            delayMinutes: data.delayMinutes || 0,
            propertyId: data.propertyId || 'default',
        },
    });
}

/**
 * Update a notification template
 */
export async function updateNotificationTemplate(
    templateId: string,
    data: {
        name?: string;
        channel?: NotificationChannel;
        subject?: string;
        body?: string;
        triggerType?: NotificationTrigger;
        delayMinutes?: number;
        isActive?: boolean;
    }
) {
    return prisma.notificationTemplate.update({
        where: { id: templateId },
        data,
    });
}

/**
 * Delete a notification template
 */
export async function deleteNotificationTemplate(templateId: string) {
    return prisma.notificationTemplate.delete({
        where: { id: templateId },
    });
}

// ── Notification Logs ──────────────────────────────────────────────────────────

/**
 * Get notification logs with filters
 */
export async function getNotificationLogs(filters: NotificationFilters = {}) {
    const {
        channel,
        status,
        entityType,
        entityId,
        startDate,
        endDate,
        page = 1,
        perPage = 20,
    } = filters;

    const where: any = {};
    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
        prisma.notificationLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * perPage,
            take: perPage,
        }),
        prisma.notificationLog.count({ where }),
    ]);

    return {
        logs,
        total,
        pages: Math.ceil(total / perPage),
        page,
    };
}

/**
 * Get guest notification history
 */
export async function getGuestNotifications(guestId: string, limit = 50) {
    // First get guest's phone and email
    const guest = await prisma.guest.findUnique({
        where: { id: guestId },
        select: { phone: true, email: true },
    });

    if (!guest) {
        throw new Error('Guest not found');
    }

    // Get notifications sent to this guest's phone or email
    return prisma.notificationLog.findMany({
        where: {
            OR: [
                { recipient: guest.phone ?? undefined },
                { recipient: guest.email ?? undefined },
            ],
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
    });
}

/**
 * Update notification status
 */
export async function updateNotificationStatus(
    logId: string,
    status: NotificationStatus,
    providerMessageId?: string,
    errorMessage?: string
) {
    const data: any = { status };

    if (status === 'DELIVERED') {
        data.deliveredAt = new Date();
    }

    if (status === 'READ') {
        data.readAt = new Date();
    }

    if (providerMessageId) {
        data.providerMessageId = providerMessageId;
    }

    if (errorMessage) {
        data.errorMessage = errorMessage;
    }

    return prisma.notificationLog.update({
        where: { id: logId },
        data,
    });
}

/**
 * Get notification statistics
 */
export async function getNotificationStats(
    startDate?: Date,
    endDate?: Date
) {
    const where: any = {};

    if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
    }

    const [total, sent, delivered, failed] = await Promise.all([
        prisma.notificationLog.count({ where }),
        prisma.notificationLog.count({ where: { ...where, status: 'SENT' } }),
        prisma.notificationLog.count({ where: { ...where, status: 'DELIVERED' } }),
        prisma.notificationLog.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    // Get counts by channel
    const byChannel = await prisma.notificationLog.groupBy({
        by: ['channel'],
        where,
        _count: true,
    });

    // Get counts by status
    const byStatus = await prisma.notificationLog.groupBy({
        by: ['status'],
        where,
        _count: true,
    });

    return {
        total,
        sent,
        delivered,
        failed,
        successRate: total > 0 ? (delivered / total) * 100 : 0,
        byChannel: byChannel.map((c) => ({
            channel: c.channel,
            count: c._count,
        })),
        byStatus: byStatus.map((s) => ({
            status: s.status,
            count: s._count,
        })),
    };
}