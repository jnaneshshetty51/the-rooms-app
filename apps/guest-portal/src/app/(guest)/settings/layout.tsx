import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Settings",
    description: "Manage your guest portal settings and preferences at The Rooms.",
    openGraph: {
        title: "Settings | The Rooms",
        description: "Manage your guest portal settings at The Rooms.",
        url: "https://therooms.in/settings",
    },
    alternates: {
        canonical: "https://therooms.in/settings",
    },
};

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
