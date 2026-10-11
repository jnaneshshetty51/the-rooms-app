import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Express Checkout",
    description: "Complete your hotel checkout quickly and efficiently at The Rooms.",
    openGraph: {
        title: "Express Checkout | The Rooms",
        description: "Complete your hotel checkout quickly at The Rooms.",
        url: "https://therooms.in/express-checkout",
    },
    alternates: {
        canonical: "https://therooms.in/express-checkout",
    },
};

export default function ExpressCheckoutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
