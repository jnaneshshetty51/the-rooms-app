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

    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context);
    }

    info(message: string, context?: LogContext): void {
        this.log('info', message, context);
    }

    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context);
    }

    error(message: string, error?: Error, context?: LogContext): void {
        this.log('error', message, context, error);
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

    debug(message: string, additionalContext?: LogContext): void {
        this.parent.debug(message, { ...this.context, ...additionalContext });
    }

    info(message: string, additionalContext?: LogContext): void {
        this.parent.info(message, { ...this.context, ...additionalContext });
    }

    warn(message: string, additionalContext?: LogContext): void {
        this.parent.warn(message, { ...this.context, ...additionalContext });
    }

    error(message: string, error?: Error, additionalContext?: LogContext): void {
        this.parent.error(message, error, { ...this.context, ...additionalContext });
    }
}

export const logger = new Logger();
export { Logger, ChildLogger };
