// packages/channel-manager/src/interfaces/IWebhookHandler.ts
// Webhook handler interface

import type { ChannelName } from '../types/channel';
import type { WebhookPayload } from '../types/webhook';

export interface IWebhookHandler {
    readonly channelName: ChannelName;

    // Signature verification
    verifySignature(payload: string, signature: string): boolean;

    // Payload parsing
    parsePayload(payload: string): WebhookPayload;

    // Event processing
    process(payload: WebhookPayload): Promise<void>;

    // Supported event types
    getSupportedEventTypes(): string[];
}
