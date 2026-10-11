import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Profile",
    description: "Manage your guest profile, preferences, and account settings at The Rooms hotel.",
    openGraph: {
        title: "Profile | The Rooms",
        description: "Manage your guest profile and account settings at The Rooms.",
        url: "https://therooms.in/profile",
    },
    alternates: {
        canonical: "https://therooms.in/profile",
    },
};

export default function ProfileLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
