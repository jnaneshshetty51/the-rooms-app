import { z } from 'zod';

export function validateRequest<T extends z.ZodSchema>(
    schema: T,
    source: 'body' | 'query' | 'params' = 'body'
) {
    return async (request: Request) => {
        let data: unknown;

        if (source === 'body') {
            data = await request.json();
        } else if (source === 'query') {
            const url = new URL(request.url);
            data = Object.fromEntries(url.searchParams);
        }

        const result = schema.safeParse(data);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.flatten().fieldErrors,
            };
        }

        return { success: true, data: result.data };
    };
}
