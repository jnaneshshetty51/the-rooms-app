"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MapPin, Wifi, Wind, Zap, Droplets, Tv, Briefcase, Lock, Car, Shield, Utensils, Coffee, ChevronLeft, ChevronRight, Calendar, ArrowRight } from "lucide-react";
import { cn } from "@the-rooms/ui";

const AMENITY_ICONS: Record<string, any> = {
  "WiFi": Wifi,
  "Air Conditioning": Wind,
  "Power Backup": Zap,
  "Hot Water": Droplets,
  "Smart TV": Tv,
  "Work Desk": Briefcase,
  "Electronic Safe": Lock,
  "Parking": Car,
  "Room Service": Utensils,
  "Mini Bar": Coffee,
  "24/7 Reception": Shield,
  "CCTV": Shield,
};

const ROOM_DATA: Record<string, any> = {
  default: {
    roomNumber: "S101",
    type: "STUDIO",
    basePriceSingle: 999,
    basePriceDouble: 1799,
    description: "A thoughtfully designed Studio room with premium amenities. Features a comfortable queen-size bed, dedicated work desk with high-speed WiFi, split AC, and a modern bathroom with hot water.",
    features: ["WiFi 100 Mbps", "Split AC", "Hot Water 24/7", "Work Desk", "Queen Bed", "Electronic Safe", "Smart TV"],
    photos: [
      "https://picsum.photos/seed/studio101a/800/600",
      "https://picsum.photos/seed/studio101b/800/600",
      "https://picsum.photos/seed/studio101c/800/600",
    ],
  },
};

export default function RoomDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [currentPhoto, setCurrentPhoto] = useState(0);

  const room = ROOM_DATA.default;
  const photos = room.photos;

  const nextPhoto = () => setCurrentPhoto((p) => (p + 1) % photos.length);
  const prevPhoto = () => setCurrentPhoto((p) => (p - 1 + photos.length) % photos.length);

  return (
    <div className="pt-20">
      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/rooms" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to Rooms
        </Link>
      </div>

      {/* Photo Gallery */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden bg-accent">
          <Image
            src={photos[currentPhoto]}
            alt={`Room ${room.roomNumber} - Photo ${currentPhoto + 1}`}
            fill
            className="object-cover"
          />

          {photos.length > 1 && (
            <>
              <button
                onClick={prevPhoto}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-primary hover:bg-white flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextPhoto}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-primary hover:bg-white flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {photos.map((_: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhoto(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      i === currentPhoto ? "bg-white" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold",
                  room.type === "STUDIO" ? "bg-primary text-primary-foreground" : "bg-secondary text-white"
                )}>
                  {room.type}
                </span>
                <span className="text-sm text-muted">Room {room.roomNumber}</span>
              </div>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
                {room.type === "STUDIO" ? "Studio Room" : "Premium Room"}
              </h1>
              <div className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="w-4 h-4" />
                Floor 1, The Rooms Hotel, MG Road, Bangalore
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="font-heading text-lg font-bold text-primary mb-2">About This Room</h2>
              <p className="text-muted leading-relaxed">{room.description}</p>
            </div>

            {/* Features */}
            <div>
              <h2 className="font-heading text-lg font-bold text-primary mb-3">Room Features</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {room.features.map((feature: string) => {
                  const Icon = AMENITY_ICONS[feature] || Wifi;
                  return (
                    <div key={feature} className="flex items-center gap-3 p-3 bg-white rounded-xl border">
                      <Icon className="w-5 h-5 text-secondary shrink-0" />
                      <span className="text-sm font-medium text-primary">{feature}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gallery Thumbnails */}
            <div>
              <h2 className="font-heading text-lg font-bold text-primary mb-3">Gallery</h2>
              <div className="grid grid-cols-3 gap-3">
                {photos.map((photo: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPhoto(i)}
                    className={cn(
                      "relative h-24 rounded-xl overflow-hidden border-2 transition-all",
                      i === currentPhoto ? "border-secondary" : "border-transparent hover:border-secondary/30"
                    )}
                  >
                    <Image src={photo} alt={`Gallery ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border shadow-sm p-6 sticky top-24">
              <h3 className="font-heading text-lg font-bold text-primary mb-4">Pricing</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Single Occupancy</span>
                  <span className="font-semibold">₹{room.basePriceSingle.toLocaleString("en-IN")}/night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Double Occupancy</span>
                  <span className="font-semibold">₹{room.basePriceDouble.toLocaleString("en-IN")}/night</span>
                </div>
                <div className="text-xs text-muted border-t pt-2">
                  All prices include 18% GST
                </div>
              </div>

              <Link
                href="/book"
                className="flex items-center justify-center gap-2 w-full py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                Book This Room
              </Link>

              <div className="mt-4 text-center text-xs text-muted">
                Free cancellation up to 48h before check-in
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
