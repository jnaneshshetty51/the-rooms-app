import type { Metadata } from "next";
import { FAQClient } from "./FAQClient";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about The Rooms hotel: check-in/out times, cancellation policy, pet policy, payment options, and more.",
};

export default function FAQPage() {
  return <FAQClient />;
}
