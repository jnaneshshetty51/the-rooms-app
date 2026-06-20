"use client";

// apps/admin/src/components/notifications/NotificationPanel.tsx
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, ExternalLink, RefreshCw, Mail, AlertCircle, CreditCard } from "lucide-react";
import { Button } from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

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

interface NotificationPanelProps {
    notifications: Notification[];
    loading: boolean;
    onClose: () => void;
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onRefresh: () => void;
}

function getNotificationIcon(type: string) {
    switch (type) {
        case "EMAIL_SENT":
            return <Mail className="h-4 w-4 text-green-600" />;
        case "EMAIL_FAILED":
            return <AlertCircle className="h-4 w-4 text-red-600" />;
        case "BOOKING_CONFIRMED":
            return <CreditCard className="h-4 w-4 text-blue-600" />;
        default:
            return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
}

export function NotificationPanel({
    notifications,
    loading,
    onClose,
    onMarkAsRead,
    onMarkAllAsRead,
    onRefresh,
}: NotificationPanelProps) {
    const router = useRouter();
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
        if (notification.bookingId) {
            router.push(`/bookings/${notification.bookingId}`);
            onClose();
        }
    };

    return (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] bg-background border rounded-lg shadow-lg z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={onRefresh}
                        title="Refresh"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                    </Button>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={onMarkAllAsRead}
                        >
                            <CheckCheck className="h-4 w-4 mr-1" />
                            Mark all read
                        </Button>
                    )}
                </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto">
                {loading && notifications.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground">No notifications yet</p>
                    </div>
                ) : (
                    <div className="divide-y">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={cn(
                                    "flex items-start gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors",
                                    !notification.isRead && "bg-accent/30"
                                )}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <div className="flex-shrink-0 mt-0.5">
                                    {getNotificationIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={cn(
                                            "text-sm font-medium truncate",
                                            !notification.isRead && "text-foreground"
                                        )}>
                                            {notification.title}
                                        </p>
                                        {!notification.isRead && (
                                            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary" />
                                        )}
                                    </div>
                                    {notification.message && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {notification.message}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(notification.createdAt, "short")}
                                        </span>
                                        {notification.bookingId && (
                                            <span className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                                                <ExternalLink className="h-3 w-3" />
                                                View booking
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {!notification.isRead && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 flex-shrink-0"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onMarkAsRead(notification.id);
                                        }}
                                        title="Mark as read"
                                    >
                                        <Check className="h-3 w-3" />
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t px-4 py-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                        router.push("/notifications");
                        onClose();
                    }}
                >
                    View all notifications
                </Button>
            </div>
        </div>
    );
}
