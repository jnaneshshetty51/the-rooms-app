import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Booking Details",
    description: "View and manage your hotel booking details at The Rooms.",
    openGraph: {
        title: "Booking Details | The Rooms",
        description: "View and manage your hotel booking details at The Rooms.",
        url: "https://therooms.in/bookings",
    },
    alternates: {
        canonical: "https://therooms.in/bookings",
    },
};

export default function BookingDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
