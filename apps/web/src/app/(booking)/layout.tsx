import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { BookingSteps } from "@/components/booking/BookingSteps";

export const metadata: Metadata = {
  title: "Book a Room",
  description: "Book your stay at The Rooms. Choose dates, room type, and complete your reservation.",
};

const STEPS = [
  { number: 1, label: "Select Dates" },
  { number: 2, label: "Choose Room" },
  { number: 3, label: "Your Details" },
  { number: 4, label: "Payment" },
  { number: 5, label: "Confirmed" },
];

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-accent/20">
      <SiteHeader />
      <div className="flex-1 pt-20 pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-6 text-center">
            Book Your Stay
          </h1>
          <BookingSteps steps={STEPS} />
          <div className="mt-6">{children}</div>
        </div>
      </div>
      <SiteFooter />
      <WhatsAppFloat />
    </div>
  );
}
