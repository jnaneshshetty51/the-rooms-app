const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
];

const optionalEnvVars = [
    'REDIS_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
];

export function validateEnv() {
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional
    const missingOptional = optionalEnvVars.filter(v => !process.env[v]);
    if (missingOptional.length > 0) {
        console.warn(`Missing optional environment variables: ${missingOptional.join(', ')}`);
    }
}

// Call at app startup
validateEnv();

// ─── Pricing constants ────────────────────────────────────────────────────────

export const PRICING_CONFIG = {
    GST_RATE: 0.18,
    EXTRA_GUEST_RATE_DAILY: 500,
    FREE_GUESTS_COUNT: 2,
} as const;

// ─── Date utilities ───────────────────────────────────────────────────────────

export function calculateNights(checkIn: Date, checkOut: Date): number {
    return Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
}

export function shouldUseMonthlyRate(
    bookingType: string,
    roomType: string,
    nights: number
): boolean {
    return bookingType === 'MONTHLY' && nights >= 28 && roomType === 'STUDIO';
}

export function hasDateOverlap(
    start1: Date, end1: Date,
    start2: Date, end2: Date
): boolean {
    return start1 < end2 && end1 > start2;
}
