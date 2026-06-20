import pino from 'pino';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

// Add request context
export function createChildLogger(context: Record<string, unknown>) {
    return logger.child(context);
}
