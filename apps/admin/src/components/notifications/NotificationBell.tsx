"use client";

// apps/admin/src/components/notifications/NotificationBell.tsx
import { useState, useEffect, useRef } from "react";
import { Bell, Check } from "lucide-react";
import { Button } from "@the-rooms/ui";
import { NotificationPanel } from "./NotificationPanel";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    bookingId?: string | null;
    guestName?: string | null;
    createdAt: string;
    isRead: boolean;
}

export function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch notifications
    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/notifications/logs?perPage=20");
            if (res.ok) {
                const data = await res.json();
                // Transform the data to match our Notification interface
                const transformed: Notification[] = (data.notifications || []).map((n: {
                    id: string;
                    type: string;
                    recipient?: string;
                    subject?: string;
                    bookingId?: string | null;
                    sentAt?: string;
                    status?: string;
                }) => ({
                    id: n.id,
                    type: n.type,
                    title: n.subject || n.type,
                    message: n.recipient ? `To: ${n.recipient}` : "",
                    bookingId: n.bookingId,
                    guestName: n.recipient,
                    createdAt: n.sentAt || new Date().toISOString(),
                    isRead: n.status === "READ",
                }));
                setNotifications(transformed);
                setUnreadCount(transformed.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error("[NotificationBell] Failed to fetch notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll for new notifications every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAsRead = async (notificationId: string) => {
        // Optimistic update
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        // In a real app, you would call an API to mark as read
    };

    const handleMarkAllAsRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        // In a real app, you would call an API to mark all as read
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsOpen(!isOpen)}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </Button>

            {isOpen && (
                <NotificationPanel
                    notifications={notifications}
                    loading={loading}
                    onClose={() => setIsOpen(false)}
                    onMarkAsRead={handleMarkAsRead}
                    onMarkAllAsRead={handleMarkAllAsRead}
                    onRefresh={fetchNotifications}
                />
            )}
        </div>
    );
}
