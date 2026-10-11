import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Payments",
    description: "View and manage your hotel payments, invoices, and payment history at The Rooms.",
    openGraph: {
        title: "Payments | The Rooms",
        description: "View and manage your hotel payments at The Rooms.",
        url: "https://therooms.in/payments",
    },
    alternates: {
        canonical: "https://therooms.in/payments",
    },
};

export default function PaymentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
