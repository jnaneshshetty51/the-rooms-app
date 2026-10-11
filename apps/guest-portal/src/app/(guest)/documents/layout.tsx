import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Documents",
    description: "Upload and manage your hotel booking documents, ID proofs, and travel agreements at The Rooms.",
    openGraph: {
        title: "Documents | The Rooms",
        description: "Upload and manage your hotel booking documents at The Rooms.",
        url: "https://therooms.in/documents",
    },
    alternates: {
        canonical: "https://therooms.in/documents",
    },
};

export default function DocumentsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
