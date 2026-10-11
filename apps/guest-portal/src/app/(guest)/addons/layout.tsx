import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Add-ons & Services",
    description: "Request hotel add-on services like laundry, room service, amenities, and more at The Rooms.",
    openGraph: {
        title: "Add-ons & Services | The Rooms",
        description: "Request hotel add-on services at The Rooms.",
        url: "https://therooms.in/addons",
    },
    alternates: {
        canonical: "https://therooms.in/addons",
    },
};

export default function AddonsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
