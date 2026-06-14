// packages/channel-manager/src/webhooks/WebhookRouter.ts
// Webhook routing

import type { ChannelName } from '../types';
import type { IWebhookHandler } from '../interfaces/IWebhookHandler';
import type { WebhookPayload, WebhookResponse } from '../types/webhook';
import { logger, ChildLogger } from '../utils/logger';
// @ts-ignore - workspace dependency
import { db } from '@the-rooms/db';

export class WebhookRouter {
    private handlers: Map<ChannelName, IWebhookHandler> = new Map();
    private routerLogger: ChildLogger;

    constructor() {
        this.routerLogger = logger.child({ component: 'WebhookRouter' });
    }

    registerHandler(channel: ChannelName, handler: IWebhookHandler): void {
        this.handlers.set(channel, handler);
        this.routerLogger.info(`Registered webhook handler for ${channel}`);
    }

    getHandler(channel: ChannelName): IWebhookHandler | undefined {
        return this.handlers.get(channel);
    }

    async route(
        channel: ChannelName,
        payload: string,
        signature: string,
        headers: Record<string, string>
    ): Promise<WebhookResponse> {
        const handler = this.handlers.get(channel);
        if (!handler) {
            throw new Error(`No handler registered for channel: ${channel}`);
        }

        // 1. Verify signature
        if (!handler.verifySignature(payload, signature)) {
            this.routerLogger.warn('Invalid webhook signature', { channel });
            throw new Error('Webhook signature verification failed');
        }

        // 2. Parse payload
        const parsed = handler.parsePayload(payload);

        // 3. Log webhook
        const webhookLog = await db.webhookLog.create({
            data: {
                channelId: channel,
                channelName: channel,
                webhookType: parsed.eventType,
                eventId: parsed.eventId,
                rawPayload: JSON.parse(payload),
                status: 'RECEIVED',
            },
        });

        // 4. Process asynchronously
        this.processAsync(webhookLog.id, handler, parsed);

        // 5. Return immediate acknowledgment
        return { status: 'RECEIVED', webhookId: webhookLog.id };
    }

    private async processAsync(
        webhookLogId: string,
        handler: IWebhookHandler,
        payload: WebhookPayload
    ): Promise<void> {
        const startTime = Date.now();

        try {
            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: { status: 'PROCESSING' },
            });

            await handler.process(payload);

            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'PROCESSED',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });
        } catch (error) {
            this.routerLogger.error('Webhook processing failed', error as Error, {
                webhookLogId,
                eventType: payload.eventType,
            });

            await db.webhookLog.update({
                where: { id: webhookLogId },
                data: {
                    status: 'FAILED',
                    errorMessage: error instanceof Error ? error.message : 'Unknown error',
                    processedAt: new Date(),
                    processingTimeMs: Date.now() - startTime,
                },
            });

            // Schedule retry
            await this.scheduleRetry(webhookLogId);
        }
    }

    private async scheduleRetry(webhookLogId: string): Promise<void> {
        // In production, this would use a job queue like Bull
        // For now, just log the retry intent
        this.routerLogger.info('Scheduling webhook retry', { webhookLogId });
    }
}
