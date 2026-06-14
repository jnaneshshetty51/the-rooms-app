// packages/channel-manager/src/utils/retry.ts
// Retry utility with exponential backoff

export interface RetryOptions {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: (string | RegExp)[];
}

export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDurationMs: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'ECONNREFUSED',
        'network error',
        /5\d{2}/, // 5xx errors
    ],
};

export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<RetryResult<T>> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const startTime = Date.now();
    let attempts = 0;
    let delay = opts.initialDelayMs;

    while (attempts <= opts.maxRetries) {
        attempts++;

        try {
            const result = await fn();
            return {
                success: true,
                result,
                attempts,
                totalDurationMs: Date.now() - startTime,
            };
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            const isRetryable = isRetryableError(err, opts.retryableErrors);

            if (attempts > opts.maxRetries || !isRetryable) {
                return {
                    success: false,
                    error: err,
                    attempts,
                    totalDurationMs: Date.now() - startTime,
                };
            }

            if (attempts <= opts.maxRetries) {
                await sleep(delay);
                delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
            }
        }
    }

    return {
        success: false,
        error: new Error('Max retries exceeded'),
        attempts,
        totalDurationMs: Date.now() - startTime,
    };
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error: Error, retryableErrors: (string | RegExp)[]): boolean {
    const errorMessage = error.message.toLowerCase();

    for (const pattern of retryableErrors) {
        if (pattern instanceof RegExp) {
            if (pattern.test(errorMessage)) return true;
        } else {
            if (errorMessage.includes(pattern.toLowerCase())) return true;
        }
    }

    return false;
}
