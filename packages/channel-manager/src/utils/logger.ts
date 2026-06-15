// packages/channel-manager/src/utils/logger.ts
// Structured logging utility

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
    channelId?: string;
    channelName?: string;
    syncType?: string;
    bookingId?: string;
    correlationId?: string;
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: Error;
}

class Logger {
    private serviceName = 'channel-manager';

    private formatLog(entry: LogEntry): string {
        const base = {
            service: this.serviceName,
            timestamp: entry.timestamp,
            level: entry.level.toUpperCase(),
            message: entry.message,
            ...entry.context,
        };

        if (entry.error) {
            return JSON.stringify({
                ...base,
                error: {
                    message: entry.error.message,
                    stack: entry.error.stack,
                    name: entry.error.name,
                },
            });
        }

        return JSON.stringify(base);
    }

    private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context,
            error,
        };

        const formatted = this.formatLog(entry);

        switch (level) {
            case 'error':
                console.error(formatted);
                break;
            case 'warn':
                console.warn(formatted);
                break;
            default:
                console.log(formatted);
        }
    }

    private resolve(
        contextOrMessage: LogContext | string,
        second?: string | LogContext
    ): { msg: string; ctx?: LogContext } {
        if (typeof contextOrMessage === 'string') {
            // Old-style: (message, context?) or just (message)
            const ctx = second !== undefined && typeof second !== 'string' ? second : undefined;
            return { msg: contextOrMessage, ctx };
        }
        // Pino-style: (context, message)
        return { msg: typeof second === 'string' ? second : '', ctx: contextOrMessage };
    }

    debug(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        const { msg, ctx } = this.resolve(contextOrMessage, second);
        this.log('debug', msg, ctx);
    }

    info(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        const { msg, ctx } = this.resolve(contextOrMessage, second);
        this.log('info', msg, ctx);
    }

    warn(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        const { msg, ctx } = this.resolve(contextOrMessage, second);
        this.log('warn', msg, ctx);
    }

    error(contextOrMessage: LogContext | string, messageOrError?: string | Error | LogContext, context?: LogContext): void {
        if (typeof contextOrMessage === 'string') {
            const err = messageOrError instanceof Error ? messageOrError : undefined;
            const ctx = typeof messageOrError === 'object' && !(messageOrError instanceof Error) ? messageOrError as LogContext : context;
            this.log('error', contextOrMessage, ctx, err);
        } else {
            const msg = typeof messageOrError === 'string' ? messageOrError : '';
            const { error: errField, ...ctx } = contextOrMessage as LogContext & { error?: Error };
            this.log('error', msg, ctx, errField);
        }
    }

    // Create child logger with persistent context
    child(context: LogContext): ChildLogger {
        return new ChildLogger(this, context);
    }
}

class ChildLogger {
    constructor(
        private parent: Logger,
        private context: LogContext
    ) { }

    debug(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        if (typeof contextOrMessage === 'string') {
            this.parent.debug({ ...this.context }, contextOrMessage);
        } else {
            this.parent.debug({ ...this.context, ...contextOrMessage }, second);
        }
    }

    info(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        if (typeof contextOrMessage === 'string') {
            this.parent.info({ ...this.context }, contextOrMessage);
        } else {
            this.parent.info({ ...this.context, ...contextOrMessage }, second);
        }
    }

    warn(contextOrMessage: LogContext | string, second?: string | LogContext): void {
        if (typeof contextOrMessage === 'string') {
            this.parent.warn({ ...this.context }, contextOrMessage);
        } else {
            this.parent.warn({ ...this.context, ...contextOrMessage }, second);
        }
    }

    error(contextOrMessage: LogContext | string, messageOrError?: string | Error | LogContext, additionalContext?: LogContext): void {
        if (typeof contextOrMessage === 'string') {
            this.parent.error(contextOrMessage, messageOrError, { ...this.context, ...additionalContext });
        } else {
            this.parent.error({ ...this.context, ...contextOrMessage }, messageOrError, additionalContext);
        }
    }
}

export const logger = new Logger();
export { Logger, ChildLogger };
