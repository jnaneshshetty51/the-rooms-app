// apps/admin/src/app/not-found.tsx
// 404 page for admin portal

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@the-rooms/ui';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <div className="text-center max-w-md px-4">
                <div className="text-8xl font-bold text-primary mb-4">404</div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                    Page Not Found
                </h1>
                <p className="text-muted-foreground mb-6">
                    Sorry, we couldn't find the page you're looking for.
                    It might have been moved or deleted.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/dashboard">
                            <Home className="w-4 h-4 mr-2" />
                            Go to Dashboard
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => window.history.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        </div>
    );
}
