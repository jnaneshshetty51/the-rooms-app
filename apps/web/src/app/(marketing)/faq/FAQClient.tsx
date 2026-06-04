"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@the-rooms/ui";

const FAQ_SECTIONS = [
  {
    title: "Check-In & Check-Out",
    faqs: [
      {
        q: "What are the check-in and check-out times?",
        a: "Standard check-in is from 2:00 PM and check-out is by 11:00 AM. Early check-in and late check-out are subject to availability. Please contact the front desk to arrange.",
      },
      {
        q: "Can I check in late at night?",
        a: "Yes, our front desk is staffed 24/7. You can check in at any time. Just make a booking online or call us to let us know your estimated arrival time.",
      },
      {
        q: "Is early check-in available?",
        a: "Early check-in from 10:00 AM can sometimes be arranged, subject to room availability. A fee of ₹300 applies. Contact reception to check availability.",
      },
      {
        q: "Can I get a late check-out?",
        a: "Late check-out until 3:00 PM may be available for ₹500. Check-out after 3:00 PM is charged at 50% of the nightly rate. Please inform reception the night before.",
      },
    ],
  },
  {
    title: "Cancellation & Refunds",
    faqs: [
      {
        q: "What is your cancellation policy?",
        a: "Free cancellation up to 48 hours before check-in. Cancellations within 48 hours of check-in are charged 1 night's rate. No-shows are charged the full booking amount.",
      },
      {
        q: "How do I cancel my booking?",
        a: "You can cancel directly from your booking confirmation email or by logging into your guest account. For assistance, call +91 73490 47799 or email hello@therooms.in.",
      },
      {
        q: "When will I receive my refund?",
        a: "Refunds are processed within 5–7 business days. The amount is credited to the original payment method. Cash refunds are available for cash bookings.",
      },
    ],
  },
  {
    title: "Payments & Pricing",
    faqs: [
      {
        q: "What payment methods do you accept?",
        a: "We accept all major debit/credit cards, UPI, net banking, and cash. Online payments can be made securely via our website using Razorpay.",
      },
      {
        q: "Is GST included in the room price?",
        a: "Yes, all displayed prices include 18% GST. We can provide a GST invoice with your company name for business stays.",
      },
      {
        q: "Do you require a security deposit?",
        a: "A refundable security deposit of ₹1,000 (Studio) or ₹2,000 (Premium) is taken at check-in. It is refunded at check-out if no damages or extras are incurred.",
      },
    ],
  },
  {
    title: "Pets & Rules",
    faqs: [
      {
        q: "Are pets allowed?",
        a: "We love animals, but unfortunately pets are not allowed in the hotel to maintain a comfortable environment for all guests. Service animals are welcome.",
      },
      {
        q: "Is smoking allowed?",
        a: "The Rooms is a strictly non-smoking property. Smoking in the room incurs a cleaning fee of ₹5,000. Designated smoking areas are available outside the building.",
      },
      {
        q: "What is the minimum age to book?",
        a: "Guests must be at least 18 years old to book a room. Valid government ID is required at check-in.",
      },
    ],
  },
  {
    title: "Amenities & Services",
    faqs: [
      {
        q: "Is breakfast included in the room rate?",
        a: "Breakfast is not included in standard rates. Breakfast packages can be added at ₹250 per person per day. Premium rooms include breakfast.",
      },
      {
        q: "Is WiFi free?",
        a: "Yes, 100 Mbps high-speed WiFi is free for all guests. No password required — connect to 'TheRooms_WiFi'.",
      },
      {
        q: "Do you have parking?",
        a: "Yes, complimentary on-site parking is available. Parking is at your own risk. We also offer airport transfer services on request.",
      },
      {
        q: "Can I extend my stay?",
        a: "Yes, extensions are subject to room availability. Contact the front desk or your guest portal to request an extension. Monthly stays can be renewed at the same rate.",
      },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-medium text-primary pr-4">{q}</span>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-muted shrink-0 transition-transform",
            open ? "rotate-180" : ""
          )}
        />
      </button>
      {open && (
        <div className="pb-4 text-sm text-muted leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}

export function FAQClient() {
  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Everything you need to know before and during your stay.
          </p>
        </div>
      </div>

      {/* FAQ Sections */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title} className="mb-10">
            <h2 className="font-heading text-xl font-bold text-primary mb-2">{section.title}</h2>
            <div className="bg-white rounded-xl border px-5">
              {section.faqs.map((faq) => (
                <FAQItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </section>
        ))}

        {/* Still have questions */}
        <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-6 text-center">
          <h3 className="font-heading font-bold text-primary mb-2">Still have questions?</h3>
          <p className="text-sm text-muted mb-4">
            Our team is available 24/7. Call us or send a WhatsApp.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="tel:+917349047799" className="px-5 py-2 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors">
              Call +91 73490 47799
            </a>
            <a href="https://wa.me/917204619899" target="_blank" rel="noopener noreferrer"
              className="px-5 py-2 bg-[#25D366] text-white text-sm font-semibold rounded-lg hover:bg-[#25D366]/90 transition-colors">
              WhatsApp Us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
