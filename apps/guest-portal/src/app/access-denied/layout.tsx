import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Access Denied",
    description: "Access denied page for The Rooms guest portal.",
    robots: {
        index: false,
        follow: false,
    },
};

export default function AccessDeniedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
