import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Dashboard",
    description: "View your guest dashboard with upcoming bookings, loyalty status, and quick actions at The Rooms hotel.",
    openGraph: {
        title: "Guest Dashboard | The Rooms",
        description: "View your guest dashboard with upcoming bookings, loyalty status, and quick actions.",
        url: "https://therooms.in/dashboard",
    },
    alternates: {
        canonical: "https://therooms.in/dashboard",
    },
};

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
