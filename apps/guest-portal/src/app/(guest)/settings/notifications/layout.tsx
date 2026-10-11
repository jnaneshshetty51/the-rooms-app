import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Notification Settings",
    description: "Manage your notification preferences for bookings, promotions, and hotel updates at The Rooms.",
    openGraph: {
        title: "Notification Settings | The Rooms",
        description: "Manage your notification preferences at The Rooms.",
        url: "https://therooms.in/settings/notifications",
    },
    alternates: {
        canonical: "https://therooms.in/settings/notifications",
    },
};

export default function NotificationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
