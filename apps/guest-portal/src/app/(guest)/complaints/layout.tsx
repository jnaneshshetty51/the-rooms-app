import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Complaints",
    description: "Raise and track complaints during your stay at The Rooms hotel.",
    openGraph: {
        title: "Complaints | The Rooms",
        description: "Raise and track complaints during your stay at The Rooms.",
        url: "https://therooms.in/complaints",
    },
    alternates: {
        canonical: "https://therooms.in/complaints",
    },
};

export default function ComplaintsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
