import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "My Bookings",
    description: "View and manage all your hotel bookings, including upcoming and past stays at The Rooms.",
    openGraph: {
        title: "My Bookings | The Rooms",
        description: "View and manage all your hotel bookings at The Rooms.",
        url: "https://therooms.in/bookings",
    },
    alternates: {
        canonical: "https://therooms.in/bookings",
    },
};

export default function BookingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
