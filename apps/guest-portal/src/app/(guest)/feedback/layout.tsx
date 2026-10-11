import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Feedback",
    description: "Share your hotel stay feedback and reviews at The Rooms.",
    openGraph: {
        title: "Feedback | The Rooms",
        description: "Share your hotel stay feedback and reviews at The Rooms.",
        url: "https://therooms.in/feedback",
    },
    alternates: {
        canonical: "https://therooms.in/feedback",
    },
};

export default function FeedbackLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
