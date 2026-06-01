import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { cn } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Transparent pricing for all room types. Daily and monthly plans. Studio from ₹999/night. Premium from ₹1,999/night.",
};

const DAILY_RATES = [
  {
    type: "STUDIO",
    single: 999,
    double: 1799,
    features: [
      { label: "Queen-size Bed", included: true },
      { label: "Work Desk & Chair", included: true },
      { label: "High-Speed WiFi", included: true },
      { label: "Split AC", included: true },
      { label: "Hot Water", included: true },
      { label: "Room Service", included: false },
      { label: "Mini Bar", included: false },
      { label: "City View", included: false },
    ],
    popular: false,
  },
  {
    type: "PREMIUM",
    single: 1999,
    double: 2999,
    features: [
      { label: "King-size Bed", included: true },
      { label: "Work Desk & Chair", included: true },
      { label: "High-Speed WiFi", included: true },
      { label: "Split AC", included: true },
      { label: "Hot Water", included: true },
      { label: "Room Service", included: true },
      { label: "Mini Bar", included: true },
      { label: "City View", included: true },
    ],
    popular: true,
  },
];

const MONTHLY_RATES = [
  { label: "Studio Single Occupancy", price: 29999, note: "₹29,999/month" },
  { label: "Studio Double Occupancy", price: 39999, note: "₹39,999/month" },
];

const DISCOUNTS = [
  { name: "Corporate Discount", desc: "10–20% off for verified company bookings (5+ nights)", badge: "10–20%" },
  { name: "Student Discount", desc: "15% off for verifiable student stays (3+ nights)", badge: "15%" },
  { name: "Extended Stay", desc: "10% off for stays of 15+ nights", badge: "10%" },
  { name: "Monthly Rate", desc: "Flat monthly pricing for 28+ night stays (Studio only)", badge: "Best Value" },
];

export default function PricingPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Transparent Pricing</h1>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            No hidden fees. All taxes included in displayed prices. Book directly for the best rates.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* ── Daily Rates ──────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-2">Daily Rates</h2>
          <p className="text-muted mb-8">All prices include taxes. GST invoice provided on request.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {DAILY_RATES.map((plan) => (
              <div
                key={plan.type}
                className={cn(
                  "rounded-2xl overflow-hidden",
                  plan.popular ? "ring-2 ring-secondary shadow-lg" : "border shadow-sm"
                )}
              >
                {plan.popular && (
                  <div className="bg-secondary text-white text-center text-xs font-bold py-1.5">
                    MOST POPULAR
                  </div>
                )}
                <div className="p-6 sm:p-8 bg-white">
                  <h3 className="font-heading text-xl font-bold text-primary mb-6">
                    {plan.type === "STUDIO" ? "Studio Room" : "Premium Room"}
                  </h3>

                  <div className="space-y-4 mb-6">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Single Occupancy</span>
                      <span className="font-heading text-2xl font-bold text-primary">
                        ₹{plan.single.toLocaleString("en-IN")}
                        <span className="text-sm font-normal text-muted"> /night</span>
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-muted">Double Occupancy</span>
                      <span className="font-heading text-2xl font-bold text-primary">
                        ₹{plan.double.toLocaleString("en-IN")}
                        <span className="text-sm font-normal text-muted"> /night</span>
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    {plan.features.map((f) => (
                      <div key={f.label} className="flex items-center gap-2">
                        {f.included ? (
                          <Check className="w-4 h-4 text-vacant shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted/30 shrink-0" />
                        )}
                        <span className={cn(
                          "text-sm",
                          f.included ? "text-primary/80" : "text-muted/40"
                        )}>
                          {f.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Link
                    href="/book"
                    className={cn(
                      "mt-6 block w-full py-3 text-sm font-bold rounded-lg text-center transition-colors",
                      plan.popular
                        ? "bg-secondary text-white hover:bg-secondary/90"
                        : "bg-primary text-white hover:bg-primary/90"
                    )}
                  >
                    Book {plan.type === "STUDIO" ? "Studio" : "Premium"} →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Monthly Rates ─────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-2">Monthly Rates</h2>
          <p className="text-muted mb-8">
            Fully furnished Studio apartments for extended stays. Available for 28+ nights only. Premium rooms available on request.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {MONTHLY_RATES.map((plan) => (
              <div key={plan.label} className="bg-white border rounded-xl p-6 shadow-sm">
                <h3 className="font-heading font-semibold text-primary mb-1">{plan.label}</h3>
                <p className="text-sm text-muted mb-4">{plan.note}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-secondary">₹{plan.price.toLocaleString("en-IN")}</span>
                  <span className="text-muted text-sm">/month</span>
                </div>
                <Link
                  href="/book?type=MONTHLY"
                  className="mt-4 block w-full py-2.5 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 text-center transition-colors"
                >
                  Book Monthly →
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted">
            * Monthly rates are all-inclusive. No additional charges for utilities, WiFi, or housekeeping (twice a week).
          </p>
        </section>

        {/* ── Discounts ─────────────────────────────────────────── */}
        <section>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-2">Discounts & Offers</h2>
          <p className="text-muted mb-8">Save more on longer stays or with special programmes.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {DISCOUNTS.map((d) => (
              <div key={d.name} className="bg-white border rounded-xl p-5 shadow-sm flex gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-heading font-semibold text-primary">{d.name}</h3>
                    <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-xs font-bold rounded-full">
                      {d.badge}
                    </span>
                  </div>
                  <p className="text-sm text-muted">{d.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Daily vs Monthly Calculator ───────────────────────── */}
        <section>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-primary mb-2">Daily vs Monthly</h2>
          <p className="text-muted mb-6">Not sure which plan suits you? Compare costs.</p>
          <div className="bg-white border rounded-xl p-6 sm:p-8 shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 font-semibold text-primary">Stay Duration</th>
                  <th className="text-right py-3 font-semibold text-primary">Daily Rate Total</th>
                  <th className="text-right py-3 font-semibold text-primary">Monthly Rate</th>
                  <th className="text-right py-3 font-semibold text-primary">You Save</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { nights: 7, dailyTotal: 12593, monthly: 29999 },
                  { nights: 14, dailyTotal: 25186, monthly: 29999 },
                  { nights: 21, dailyTotal: 37779, monthly: 29999 },
                  { nights: 28, dailyTotal: 50372, monthly: 29999 },
                ].map((row) => (
                  <tr key={row.nights}>
                    <td className="py-3 text-primary">{row.nights} nights</td>
                    <td className="py-3 text-right text-muted">₹{row.dailyTotal.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-semibold text-secondary">₹{row.monthly.toLocaleString("en-IN")}</td>
                    <td className="py-3 text-right font-semibold text-vacant">
                      {row.dailyTotal > row.monthly ? `₹${(row.dailyTotal - row.monthly).toLocaleString("en-IN")} ↓` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-muted mt-4">
              * Prices shown are for Studio single occupancy. Daily rate includes 18% GST. Monthly rate is all-inclusive.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
