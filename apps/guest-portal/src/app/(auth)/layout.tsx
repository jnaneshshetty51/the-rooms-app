import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login — Guest Portal | The Rooms",
    description: "Sign in to your The Rooms guest portal. Access your bookings, invoices, and hotel services with a secure magic link.",
    keywords: [
        "hotel login",
        "guest portal login",
        "The Rooms sign in",
        "hotel booking login",
        "magic link login",
    ],
    openGraph: {
        title: "Login — Guest Portal | The Rooms",
        description: "Sign in to your The Rooms guest portal. Access your bookings, invoices, and hotel services.",
        url: "https://therooms.in/login",
        type: "website",
    },
    twitter: {
        title: "Login — Guest Portal | The Rooms",
        description: "Sign in to your The Rooms guest portal.",
    },
    alternates: {
        canonical: "https://therooms.in/login",
    },
};

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
