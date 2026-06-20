import { NextResponse } from 'next/server';
import { AppError } from './errors';
import { logger } from './logger';

export function handleApiError(error: unknown) {
    if (error instanceof AppError) {
        logger.warn({ code: error.code, message: error.message }, 'App error');
        return NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.statusCode }
        );
    }

    // Unknown errors
    logger.error({ err: error }, 'Unexpected error');
    return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
    );
}
