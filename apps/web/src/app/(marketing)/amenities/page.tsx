import type { Metadata } from "next";
import { Wifi, Wind, Zap, Droplets, Car, Tv, Shield, Utensils, Coffee, Briefcase, Shirt, Lock, Camera, Phone } from "lucide-react";
import { cn } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: "Amenities",
  description: "Full list of amenities at The Rooms hotel: WiFi, AC, Laundry, Power Backup, Kitchen, Parking, TV, Hot Water, CCTV, Room Service, Mini Bar, and more.",
};

const AMENITY_CATEGORIES = [
  {
    category: "Essential",
    icon: "🏠",
    amenities: [
      {
        name: "High-Speed WiFi",
        icon: Wifi,
        desc: "100 Mbps dedicated broadband in every room. Free for all guests.",
        highlight: true,
      },
      {
        name: "Air Conditioning",
        icon: Wind,
        desc: "Split AC with individual temperature control in every room.",
        highlight: true,
      },
      {
        name: "Power Backup",
        icon: Zap,
        desc: "24/7 DG backup — never a power interruption during your stay.",
        highlight: true,
      },
      {
        name: "Hot Water",
        icon: Droplets,
        desc: "Instant water heater in all bathrooms. Available 24/7.",
        highlight: false,
      },
      {
        name: "Electronic Safe",
        icon: Lock,
        desc: "In-room digital safe to store valuables. Free to use.",
        highlight: false,
      },
    ],
  },
  {
    category: "Comfort",
    icon: "🛋️",
    amenities: [
      {
        name: "Room Service",
        icon: Utensils,
        desc: "In-room dining available from 7 AM to 11 PM. Contact reception to order.",
        highlight: true,
      },
      {
        name: "Mini Bar",
        icon: Coffee,
        desc: "Curated selection of beverages and snacks in every Premium room.",
        highlight: true,
      },
      {
        name: "Power Backup",
        icon: Zap,
        desc: "24/7 DG backup — never a power interruption during your stay.",
        highlight: false,
      },
    ],
  },
  {
    category: "Entertainment",
    icon: "📺",
    amenities: [
      {
        name: "Smart TV",
        icon: Tv,
        desc: "43\" Smart TV with Netflix, YouTube, and local channels.",
        highlight: true,
      },
    ],
  },
  {
    category: "Business",
    icon: "💼",
    amenities: [
      {
        name: "Work Desk",
        icon: Briefcase,
        desc: "Ergonomic work desk with USB charging ports and good lighting.",
        highlight: true,
      },
      {
        name: "Iron & Board",
        icon: Shirt,
        desc: "Iron and ironing board available on request at reception.",
        highlight: false,
      },
      {
        name: "High-Speed WiFi",
        icon: Wifi,
        desc: "100 Mbps dedicated broadband. Work without interruption.",
        highlight: false,
      },
    ],
  },
  {
    category: "Security",
    icon: "🔒",
    amenities: [
      {
        name: "CCTV Surveillance",
        icon: Camera,
        desc: "24/7 CCTV coverage of all common areas, corridors, and entrances.",
        highlight: true,
      },
      {
        name: "Electronic Safe",
        icon: Lock,
        desc: "In-room digital safe to store valuables. Free to use.",
        highlight: false,
      },
      {
        name: "24/7 Security Guard",
        icon: Shield,
        desc: "Security personnel on duty round the clock.",
        highlight: true,
      },
    ],
  },
  {
    category: "Facilities",
    icon: "🅿️",
    amenities: [
      {
        name: "Free Parking",
        icon: Car,
        desc: "Secure on-site parking. Complimentary for all guests.",
        highlight: true,
      },
      {
        name: "Laundry Service",
        icon: Droplets,
        desc: "Same-day laundry service available. Drop at reception by 9 AM.",
        highlight: false,
      },
      {
        name: "24/7 Reception",
        icon: Phone,
        desc: "Front desk staffed 24/7 for check-in, queries, and support.",
        highlight: true,
      },
    ],
  },
];

export default function AmenitiesPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Amenities</h1>
          <p className="text-white/70 text-lg max-w-2xl">
            Everything you need for a comfortable, productive stay — thoughtfully provided at no extra cost.
          </p>
        </div>
      </div>

      {/* Amenities Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {AMENITY_CATEGORIES.map((cat) => (
          <section key={cat.category}>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-2xl">{cat.icon}</span>
              <h2 className="font-heading text-2xl font-bold text-primary">{cat.category}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cat.amenities.map((amenity) => {
                const Icon = amenity.icon;
                return (
                  <div
                    key={amenity.name}
                    className={cn(
                      "rounded-xl p-5 card-hover",
                      amenity.highlight ? "bg-white shadow-md ring-1 ring-accent" : "bg-white border"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                        amenity.highlight ? "bg-secondary/10 text-secondary" : "bg-accent text-muted"
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold text-primary mb-1">{amenity.name}</h3>
                        <p className="text-sm text-muted leading-relaxed">{amenity.desc}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="bg-accent/30 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-2xl font-bold text-primary mb-3">
            Have a question about our amenities?
          </h2>
          <p className="text-muted mb-6">
            Our team is available 24/7. Reach out anytime.
          </p>
          <a
            href="tel:+917349047799"
            className="flex items-center gap-2 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/90 transition-colors shadow-md"
          >
            <Phone className="w-5 h-5" />
            +91 73490 47799
          </a>
        </div>
      </div>
    </div>
  );
}
