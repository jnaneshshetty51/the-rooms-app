import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Stay Details",
    description: "View detailed information about your hotel stay including room details, amenities, and booking specifics at The Rooms.",
    openGraph: {
        title: "Stay Details | The Rooms",
        description: "View detailed information about your hotel stay at The Rooms.",
        url: "https://therooms.in/stay-details",
    },
    alternates: {
        canonical: "https://therooms.in/stay-details",
    },
};

export default function StayDetailsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
