"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Calendar, Users, Star, Wifi, Wind, Car, Shield } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { formatCurrency } from "@the-rooms/ui";

const HERO_SLIDES = [
  {
    id: 1,
    image: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=1600&q=80",
    title: "Stay Premium, Pay Less",
    subtitle: "20% off on Studio rooms this season",
    cta: "Book Now",
    ctaHref: "/book",
  },
  {
    id: 2,
    image: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1600&q=80",
    title: "Monthly Stays Starting ₹29,999",
    subtitle: "Fully furnished Studio apartments for long stays",
    cta: "View Plans",
    ctaHref: "/pricing",
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1600&q=80",
    title: "Premium Rooms with City Views",
    subtitle: "Experience luxury in the heart of the city",
    cta: "Explore Rooms",
    ctaHref: "/rooms",
  },
];

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  WiFi: <Wifi className="w-5 h-5" />,
  AirConditioning: <Wind className="w-5 h-5" />,
  Parking: <Car className="w-5 h-5" />,
  Security: <Shield className="w-5 h-5" />,
};

interface RoomType {
  type: string;
  title: string;
  description: string;
  features: string[];
  basePriceDouble: number;
}

interface PublicStats {
  totalRooms: number;
  yearsOfService: number;
  guestRating: number;
  supportAvailable: string;
}

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  }, []);

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide]);

  // Fetch live data from APIs
  useEffect(() => {
    async function fetchData() {
      try {
        const [roomTypesRes, statsRes] = await Promise.all([
          fetch("/api/room-types"),
          fetch("/api/public-stats"),
        ]);

        if (roomTypesRes.ok) {
          const roomTypesData = await roomTypesRes.json();
          setRoomTypes(roomTypesData.data || []);
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData.data || null);
        }
      } catch (error) {
        console.error("Failed to fetch home page data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div>
      {/* ── Hero Carousel ─────────────────────────────────────── */}
      <section
        className="relative h-[90vh] min-h-[600px] overflow-hidden bg-primary"
        onMouseEnter={() => setIsAutoPlaying(false)}
        onMouseLeave={() => setIsAutoPlaying(true)}
      >
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700",
              index === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
            )}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
            />
            <div className="absolute inset-0 hero-overlay" />
            <div className="relative z-10 h-full flex items-center">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="max-w-2xl animate-fade-in-up">
                  <span className="inline-block px-3 py-1 bg-secondary/20 text-secondary text-xs font-semibold rounded-full mb-4 border border-secondary/30">
                    {slide.id}/3
                  </span>
                  <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-lg sm:text-xl text-white/70 mb-8 max-w-lg">
                    {slide.subtitle}
                  </p>
                  <Link
                    href={slide.ctaHref}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/90 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Calendar className="w-5 h-5" />
                    {slide.cta}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors flex items-center justify-center"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-colors flex items-center justify-center"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === currentSlide ? "w-6 bg-secondary" : "bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </section>

      {/* ── Quick Booking Bar ──────────────────────────────────── */}
      <section className="bg-white border-b shadow-sm relative z-10 -mt-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <form
            action="/book"
            method="get"
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
          >
            <div className="flex-1 grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Check-in</label>
                <input
                  type="date"
                  name="checkIn"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Check-out</label>
                <input
                  type="date"
                  name="checkOut"
                  required
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wider">Guests</label>
                <select
                  name="guests"
                  defaultValue="2"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none bg-white"
                >
                  <option value="1">1 Guest</option>
                  <option value="2">2 Guests</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="sm:w-auto px-8 py-3 bg-secondary text-white font-semibold rounded-lg hover:bg-secondary/90 transition-colors whitespace-nowrap flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Check Availability
            </button>
          </form>
        </div>
      </section>

      {/* ── Featured Amenities ──────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-accent/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
              Everything You Need
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              Premium amenities to make every stay comfortable and memorable.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: "WiFi", label: "High-Speed WiFi", desc: "100 Mbps dedicated line" },
              { icon: "AirConditioning", label: "Air Conditioning", desc: "Split AC in every room" },
              { icon: "Parking", label: "Free Parking", desc: "Secure on-site parking" },
              { icon: "Security", label: "24/7 Security", desc: "CCTV monitored premises" },
            ].map((amenity) => (
              <div
                key={amenity.label}
                className="bg-white rounded-xl p-5 text-center card-hover"
              >
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                  {AMENITY_ICONS[amenity.icon] ?? <Star className="w-5 h-5" />}
                </div>
                <h3 className="font-heading font-semibold text-primary mb-1">{amenity.label}</h3>
                <p className="text-sm text-muted">{amenity.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link
              href="/amenities"
              className="text-sm font-medium text-secondary hover:underline"
            >
              View all amenities →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Room Preview ────────────────────────────────────────── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
              Choose Your Space
            </h2>
            <p className="text-muted text-lg max-w-xl mx-auto">
              From cosy Studios to luxurious Premium rooms — we have the perfect fit for you.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {isLoading ? (
              // Loading skeleton
              [1, 2].map((i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-md">
                  <div className="h-52 sm:h-64 bg-gray-200 animate-pulse" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))
            ) : roomTypes.length > 0 ? (
              roomTypes.map((room) => (
                <div key={room.type} className="bg-white rounded-2xl overflow-hidden shadow-md card-hover">
                  <div className="relative h-52 sm:h-64 overflow-hidden">
                    <Image
                      src={room.type === "STUDIO"
                        ? "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80"
                        : "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&q=80"
                      }
                      alt={room.title}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        room.type === "STUDIO"
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-white"
                      )}>
                        {room.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 sm:p-6">
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="font-heading text-xl font-bold text-primary">{room.title}</h3>
                      <div>
                        <span className="text-2xl font-bold text-secondary">{formatCurrency(room.basePriceDouble)}</span>
                        <span className="text-sm text-muted"> /night</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted mb-4">{room.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {room.features.map((f) => (
                        <span key={f} className="px-2 py-0.5 bg-accent rounded text-xs font-medium text-muted">
                          {f}
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <Link
                        href="/rooms"
                        className="flex-1 py-2.5 border border-primary text-primary text-sm font-semibold rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors text-center"
                      >
                        View Details
                      </Link>
                      <Link
                        href="/book"
                        className="flex-1 py-2.5 bg-secondary text-white text-sm font-semibold rounded-lg hover:bg-secondary/90 transition-colors text-center"
                      >
                        Book Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              // Fallback if no room types available
              <p className="text-center col-span-2 text-muted">Room availability coming soon.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────── */}
      <section className="py-16 bg-primary text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {isLoading ? (
              // Loading skeleton
              [1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-10 w-16 mx-auto bg-white/20 rounded animate-pulse mb-2" />
                  <div className="h-4 w-20 mx-auto bg-white/20 rounded animate-pulse" />
                </div>
              ))
            ) : (
              <>
                <div>
                  <div className="font-heading text-4xl sm:text-5xl font-bold text-secondary mb-1">
                    {stats?.totalRooms ?? "—"}
                  </div>
                  <div className="text-sm text-white/60">Rooms</div>
                </div>
                <div>
                  <div className="font-heading text-4xl sm:text-5xl font-bold text-secondary mb-1">
                    {stats?.yearsOfService ? `${stats.yearsOfService}+` : "—"}
                  </div>
                  <div className="text-sm text-white/60">Years of Service</div>
                </div>
                <div>
                  <div className="font-heading text-4xl sm:text-5xl font-bold text-secondary mb-1">
                    {stats?.guestRating ?? "—"}
                  </div>
                  <div className="text-sm text-white/60">Guest Rating</div>
                </div>
                <div>
                  <div className="font-heading text-4xl sm:text-5xl font-bold text-secondary mb-1">
                    {stats?.supportAvailable ?? "24/7"}
                  </div>
                  <div className="text-sm text-white/60">Support</div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ───────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-accent/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
              Why Guests Love Us
            </h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                title: "Prime Location",
                desc: "Centrally located with easy access to business districts, markets, and transport hubs.",
              },
              {
                title: "Best Rate Guarantee",
                desc: "Book directly on our website for the lowest rates. No hidden charges, no commission markups.",
              },
              {
                title: "Flexible Stays",
                desc: "Choose from daily, weekly, or monthly plans. Stay as long as you need — we adapt to you.",
              },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-4">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-secondary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready for Your Next Stay?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Book directly with us for the best rates and instant confirmation. No middlemen.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-secondary font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              <Calendar className="w-5 h-5" />
              Book a Room
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition-colors"
            >
              <Users className="w-5 h-5" />
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
