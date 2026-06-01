import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Badge } from "@the-rooms/ui";
import { RoomCard } from "@the-rooms/ui";

export const metadata: Metadata = {
  title: "Rooms",
  description: "Browse all 36 rooms — 18 Studio and 18 Premium. Filter by room type and view photos, amenities, and prices.",
};

// Static room data for the public showcase (no DB dependency in this render)
const ROOMS = [
  // STUDIO Rooms S101–S118
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `studio-${i + 1}`,
    roomNumber: `S${String(i + 101).padStart(3, "0")}`,
    type: "STUDIO" as const,
    floor: Math.floor(i / 5) + 1,
    basePriceSingle: 999,
    basePriceDouble: 1799,
    features: ["Queen Bed", "Work Desk", "WiFi", "AC", "Hot Water"],
    image: `https://picsum.photos/seed/studio${i}/600/400`,
    status: i % 5 === 0 ? "VACANT" as const : i % 5 === 1 ? "VACANT" as const : i % 5 === 2 ? "OCCUPIED" as const : i % 5 === 3 ? "VACANT" as const : "MAINTENANCE" as const,
  })),
  // PREMIUM Rooms P101–P118
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `premium-${i + 1}`,
    roomNumber: `P${String(i + 101).padStart(3, "0")}`,
    type: "PREMIUM" as const,
    floor: Math.floor(i / 4) + 5,
    basePriceSingle: 1999,
    basePriceDouble: 2999,
    features: ["King Bed", "Mini Bar", "City View", "Room Service", "Work Desk"],
    image: `https://picsum.photos/seed/premium${i}/600/400`,
    status: i % 4 === 0 ? "VACANT" as const : i % 4 === 1 ? "VACANT" as const : i % 4 === 2 ? "OCCUPIED" as const : "VACANT" as const,
  })),
];

export default function RoomsPage() {
  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Our Rooms</h1>
          <p className="text-white/70 text-lg max-w-2xl">
            36 thoughtfully designed rooms across Studio and Premium categories. Find your perfect space for daily or monthly stays.
          </p>
        </div>
      </div>

      {/* Filter & Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {(["ALL", "STUDIO", "PREMIUM"] as const).map((filter) => (
            <Link
              key={filter}
              href={filter === "ALL" ? "/rooms" : `/rooms?type=${filter}`}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-colors",
                "hover:bg-accent",
                filter === "ALL"
                  ? "bg-secondary text-white"
                  : "bg-accent text-primary hover:bg-accent/80"
              )}
            >
              {filter === "ALL" ? "All Rooms" : filter === "STUDIO" ? "Studio (18)" : "Premium (18)"}
            </Link>
          ))}
        </div>

        {/* Room Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROOMS.map((room) => (
            <RoomCard
              key={room.id}
              roomNumber={room.roomNumber}
              roomType={room.type}
              price={room.basePriceDouble}
              status={room.status}
              thumbnail={room.image}
              features={room.features}
              onClick={() => {}}
              className="bg-white"
            />
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 p-6 bg-accent/20 rounded-2xl">
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-primary">36</div>
            <div className="text-sm text-muted">Total Rooms</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-vacant">28</div>
            <div className="text-sm text-muted">Currently Available</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-secondary">18</div>
            <div className="text-sm text-muted">Premium Rooms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
