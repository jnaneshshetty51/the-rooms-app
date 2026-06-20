"use client";

// apps/admin/src/app/(dashboard)/_components/AdminHeaderClient.tsx
import { NotificationBell } from "@/components/notifications/NotificationBell";

interface AdminHeaderClientProps {
    portalName: string;
    userName: string;
}

export function AdminHeaderClient({ portalName, userName }: AdminHeaderClientProps) {
    return (
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6">
            <div className="flex flex-1 items-center gap-4">
                <h1 className="font-heading text-lg font-semibold">{portalName}</h1>
            </div>
            <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                            {userName.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <span className="text-sm font-medium hidden md:inline">{userName}</span>
                </div>
            </div>
        </header>
    );
}
