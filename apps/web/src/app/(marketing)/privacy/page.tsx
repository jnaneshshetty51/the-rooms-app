import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Our privacy policy and data handling practices.",
};

export default function PrivacyPage() {
  return (
    <div className="pt-20">
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-white/70 text-lg">How we handle and protect your data.</p>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 prose prose-stone max-w-none">
        <h2>1. Information We Collect</h2>
        <p>We collect information to provide better services to our users. This includes your name, email address, phone number, and booking details when you make a reservation.</p>
        <h2>2. How We Use Your Information</h2>
        <p>Your information is used strictly for processing bookings, communicating important updates, and improving our services.</p>
        <h2>3. Data Security</h2>
        <p>We implement strict security measures to protect your personal information against unauthorized access.</p>
      </div>
    </div>
  );
}
