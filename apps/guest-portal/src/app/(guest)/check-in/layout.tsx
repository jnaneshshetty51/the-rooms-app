import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Check-In",
    description: "Complete your hotel check-in online, upload documents, and get your room assigned at The Rooms.",
    openGraph: {
        title: "Check-In | The Rooms",
        description: "Complete your hotel check-in online at The Rooms.",
        url: "https://therooms.in/check-in",
    },
    alternates: {
        canonical: "https://therooms.in/check-in",
    },
};

export default function CheckInLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
