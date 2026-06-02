import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: "Our cancellation and refund policy.",
};

export default function CancellationPage() {
  return (
    <div className="pt-20">
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Cancellation Policy</h1>
          <p className="text-white/70 text-lg">Understanding our refund guidelines.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-stone max-w-none">
        <h2>Standard Bookings</h2>
        <p>Cancellations made 48 hours or more prior to the check-in date are eligible for a full refund.</p>
        <p>Cancellations made within 48 hours of the check-in date will be charged for the first night's stay.</p>
        <h2>No-Shows</h2>
        <p>In the event of a no-show, the total price of the reservation will be charged.</p>
        <h2>Monthly Stays</h2>
        <p>Monthly bookings require a 15-day notice period for cancellation or early termination. Refunds will be prorated based on the daily rate.</p>
      </div>
    </div>
  );
}
