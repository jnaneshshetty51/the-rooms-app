import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Invoices",
    description: "View and download your hotel invoices and billing statements from The Rooms.",
    openGraph: {
        title: "Invoices | The Rooms",
        description: "View and download your hotel invoices from The Rooms.",
        url: "https://therooms.in/invoices",
    },
    alternates: {
        canonical: "https://therooms.in/invoices",
    },
};

export default function InvoicesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
