"use client";
import Link from "next/link";

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center">
            <h1 className="text-2xl font-bold">You are offline</h1>
            <p className="text-muted-foreground">Please check your internet connection and try again.</p>
            <Link href="/" className="mt-4 text-primary hover:underline">
                Refresh page
            </Link>
        </div>
    );
}
