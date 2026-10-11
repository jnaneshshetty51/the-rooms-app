import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Cancel Booking",
    description: "Cancel your hotel booking at The Rooms.",
    robots: {
        index: false,
        follow: false,
    },
    openGraph: {
        title: "Cancel Booking | The Rooms",
        description: "Cancel your hotel booking at The Rooms.",
        url: "https://therooms.in/bookings/[id]/cancel",
    },
};

export default function CancelBookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
