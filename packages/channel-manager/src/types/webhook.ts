// packages/channel-manager/src/types/webhook.ts
// Webhook payload type definitions

export interface WebhookPayload {
    eventType: string;
    eventId: string;
    timestamp: Date;
    data: Record<string, unknown>;
}

export interface WebhookResponse {
    status: 'RECEIVED' | 'PROCESSED' | 'FAILED';
    webhookId: string;
    message?: string;
}
