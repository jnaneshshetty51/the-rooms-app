import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Modify Booking",
    description: "Modify your hotel booking dates and details at The Rooms.",
    openGraph: {
        title: "Modify Booking | The Rooms",
        description: "Modify your hotel booking at The Rooms.",
        url: "https://therooms.in/bookings/[id]/modify",
    },
};

export default function ModifyBookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
