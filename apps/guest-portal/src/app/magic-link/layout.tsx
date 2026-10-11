import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Verify Magic Link | The Rooms",
    description: "Verify your magic link to securely sign in to your The Rooms guest portal.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function MagicLinkLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
