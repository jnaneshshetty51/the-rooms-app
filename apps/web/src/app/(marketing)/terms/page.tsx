import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Terms and conditions for booking and staying at The Rooms.",
};

export default function TermsPage() {
  return (
    <div className="pt-20">
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Terms & Conditions</h1>
          <p className="text-white/70 text-lg">Rules and regulations for our guests.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-stone max-w-none">
        <h2>1. Booking Policies</h2>
        <p>All bookings require valid government identification upon check-in. The primary guest must be at least 18 years of age.</p>
        <h2>2. Check-in & Check-out</h2>
        <p>Standard check-in time is 2:00 PM and check-out time is 11:00 AM. Early check-in or late check-out is subject to availability and may incur additional charges.</p>
        <h2>3. Guest Conduct</h2>
        <p>Guests are expected to conduct themselves respectfully. Any damage to hotel property will be charged to the guest.</p>
      </div>
    </div>
  );
}
