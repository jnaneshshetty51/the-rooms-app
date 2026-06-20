'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
                <h2 className="text-lg font-semibold text-primary">Something went wrong</h2>
                <p className="text-muted-foreground mt-1">We couldn't load this page.</p>
                <button
                    onClick={reset}
                    className="mt-4 rounded-md bg-secondary px-4 py-2 text-sm text-white hover:bg-secondary/90"
                >
                    Try again
                </button>
            </div>
        </div>
    );
}