import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Extend Stay",
    description: "Request to extend your hotel stay at The Rooms.",
    openGraph: {
        title: "Extend Stay | The Rooms",
        description: "Request to extend your hotel stay at The Rooms.",
        url: "https://therooms.in/extend-stay",
    },
    alternates: {
        canonical: "https://therooms.in/extend-stay",
    },
};

export default function ExtendStayLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
