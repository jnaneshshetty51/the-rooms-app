"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
} from "@the-rooms/ui";
import {
    MessageSquare,
    Bell,
    Calendar,
    Gift,
    AlertCircle,
    CheckCircle2,
    Loader2,
} from "lucide-react";

interface NotificationPreferences {
    whatsappOptIn: boolean;
    bookingConfirmations: boolean;
    checkInReminders: boolean;
    checkOutReminders: boolean;
    promotionalMessages: boolean;
    phone: string | null;
}

function NotificationsPageContent() {
    const searchParams = useSearchParams();
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPreferences() {
            try {
                const res = await fetch("/api/settings/notifications");
                if (res.ok) {
                    const data = await res.json();
                    setPreferences(data.preferences);
                }
            } catch (err) {
                console.error("Error fetching preferences:", err);
                setError("Failed to load notification preferences");
            } finally {
                setLoading(false);
            }
        }
        fetchPreferences();
    }, []);

    const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
        if (!preferences) return;

        // If enabling any notification, must have whatsapp opt-in
        if (key !== "whatsappOptIn" && value && !preferences.whatsappOptIn) {
            setError("Please enable WhatsApp notifications first to receive updates");
            return;
        }

        setPreferences({
            ...preferences,
            [key]: value,
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preferences) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const res = await fetch("/api/settings/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(preferences),
            });

            if (!res.ok) {
                throw new Error("Failed to save preferences");
            }

            setSuccess("Notification preferences saved successfully!");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
            </div>
        );
    }

    if (!preferences) {
        return (
            <div className="text-center py-20">
                <AlertCircle className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                <p className="text-[#636E72] font-medium">Failed to load preferences</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold text-[#2D3436]">Notification Preferences</h1>
                <p className="text-sm text-[#636E72] mt-1">
                    Manage how you receive updates and notifications
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* WhatsApp Opt-In */}
                <Card className="border-2 border-[#E17055]">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#E17055]/10 flex items-center justify-center">
                                <MessageSquare className="w-5 h-5 text-[#E17055]" />
                            </div>
                            <div>
                                <span>WhatsApp Notifications</span>
                                <p className="text-xs font-normal text-[#636E72] mt-0.5">
                                    Receive updates via WhatsApp
                                </p>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm text-[#2D3436]">
                                    Enable WhatsApp to receive booking updates
                                </p>
                                {preferences.phone && (
                                    <p className="text-xs text-[#636E72] mt-1">
                                        Notifications will be sent to: {preferences.phone}
                                    </p>
                                )}
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.whatsappOptIn}
                                    onChange={(e) => handleToggle("whatsappOptIn", e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E17055]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E17055]"></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Notification Toggles */}
                <Card>
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Bell className="w-4 h-4 text-[#636E72]" />
                            Notification Types
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        {/* Booking Confirmations */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center mt-0.5">
                                    <Calendar className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2D3436]">Booking Confirmations</p>
                                    <p className="text-xs text-[#636E72]">Get notified when your booking is confirmed</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.bookingConfirmations}
                                    onChange={(e) => handleToggle("bookingConfirmations", e.target.checked)}
                                    disabled={!preferences.whatsappOptIn}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E17055]/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E17055] ${!preferences.whatsappOptIn ? "opacity-50" : ""}`}></div>
                            </label>
                        </div>

                        {/* Check-in Reminders */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                                    <Bell className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2D3436]">Check-in Reminders</p>
                                    <p className="text-xs text-[#636E72]">Receive reminders before your check-in date</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.checkInReminders}
                                    onChange={(e) => handleToggle("checkInReminders", e.target.checked)}
                                    disabled={!preferences.whatsappOptIn}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E17055]/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E17055] ${!preferences.whatsappOptIn ? "opacity-50" : ""}`}></div>
                            </label>
                        </div>

                        {/* Check-out Reminders */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center mt-0.5">
                                    <Calendar className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2D3436]">Check-out Reminders</p>
                                    <p className="text-xs text-[#636E72]">Get reminded before your check-out date</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.checkOutReminders}
                                    onChange={(e) => handleToggle("checkOutReminders", e.target.checked)}
                                    disabled={!preferences.whatsappOptIn}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E17055]/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E17055] ${!preferences.whatsappOptIn ? "opacity-50" : ""}`}></div>
                            </label>
                        </div>

                        {/* Promotional Messages */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mt-0.5">
                                    <Gift className="w-4 h-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-[#2D3436]">Promotional Messages</p>
                                    <p className="text-xs text-[#636E72]">Receive special offers and discounts</p>
                                </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={preferences.promotionalMessages}
                                    onChange={(e) => handleToggle("promotionalMessages", e.target.checked)}
                                    disabled={!preferences.whatsappOptIn}
                                    className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 rounded-full peer peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#E17055]/20 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#E17055] ${!preferences.whatsappOptIn ? "opacity-50" : ""}`}></div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-800">
                            <p className="font-medium">How WhatsApp notifications work</p>
                            <p className="mt-1 text-blue-700">
                                Once you enable WhatsApp, you'll receive updates directly to your registered phone number.
                                You can unsubscribe at any time by toggling off the notifications you no longer wish to receive.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-green-700">{success}</p>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button
                        type="submit"
                        disabled={saving}
                        className="bg-[#E17055] hover:bg-[#D35B3F] px-8"
                    >
                        {saving ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                        ) : (
                            "Save Preferences"
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}

export default function NotificationsPage() {
    return (
        <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
            <NotificationsPageContent />
        </Suspense>
    );
}
