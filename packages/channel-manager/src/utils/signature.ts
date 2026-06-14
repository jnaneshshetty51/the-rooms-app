// packages/channel-manager/src/utils/signature.ts
// Webhook signature verification utilities

import crypto from 'crypto';

/**
 * Verify HMAC-SHA256 signature
 */
export function verifyHmacSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Generate HMAC-SHA256 signature
 */
export function generateHmacSignature(payload: string, secret: string): string {
    return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');
}

/**
 * Verify HMAC-SHA1 signature (used by some older APIs)
 */
export function verifyHmacSha1Signature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expected = crypto
        .createHmac('sha1', secret)
        .update(payload)
        .digest('base64');

    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) {
        return false;
    }

    const result = crypto.timingSafeEqual(a, b);
    return result;
}

/**
 * Parse Authorization header for Bearer token
 */
export function parseBearerToken(authHeader: string | null): string | null {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
    return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash a secret for storage
 */
export function hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
}
