export class AppError extends Error {
    constructor(
        public code: string,
        message: string,
        public statusCode: number = 500
    ) {
        super(message);
        this.name = 'AppError';
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super('VALIDATION_ERROR', message, 400);
    }
}

export class NotFoundError extends AppError {
    constructor(entity: string) {
        super('NOT_FOUND', `${entity} not found`, 404);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = 'Unauthorized') {
        super('UNAUTHORIZED', message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = 'Forbidden') {
        super('FORBIDDEN', message, 403);
    }
}

export class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super('CONFLICT', message, 409);
    }
}
