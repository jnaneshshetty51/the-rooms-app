import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Loyalty Program",
    description: "View your loyalty tier, points, and rewards at The Rooms hotel loyalty program.",
    openGraph: {
        title: "Loyalty Program | The Rooms",
        description: "View your loyalty tier and rewards at The Rooms.",
        url: "https://therooms.in/loyalty",
    },
    alternates: {
        canonical: "https://therooms.in/loyalty",
    },
};

export default function LoyaltyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
