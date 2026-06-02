import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { RoomCard } from "@the-rooms/ui";
import { db } from "@the-rooms/db";

export const revalidate = 60; // ISR: refresh room data every minute

export const metadata: Metadata = {
  title: "Rooms",
  description: "Browse all 36 rooms — 18 Studio and 18 Premium. Filter by room type and view photos, amenities, and prices.",
};

// Fallback static data used when the DB is unavailable (seeding not done yet)
const STATIC_ROOMS = [
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `S${String(i + 101).padStart(3, "0")}`,
    roomNumber: `S${String(i + 101).padStart(3, "0")}`,
    type: "STUDIO" as const,
    basePriceSingle: 999,
    basePriceDouble: 1799,
    features: ["Queen Bed", "Work Desk", "WiFi", "AC", "Hot Water"],
    image: `https://picsum.photos/seed/studio${i}/600/400`,
    status: "VACANT" as const,
  })),
  ...Array.from({ length: 18 }, (_, i) => ({
    id: `P${String(i + 101).padStart(3, "0")}`,
    roomNumber: `P${String(i + 101).padStart(3, "0")}`,
    type: "PREMIUM" as const,
    basePriceSingle: 1999,
    basePriceDouble: 2999,
    features: ["King Bed", "Mini Bar", "City View", "Room Service", "Work Desk"],
    image: `https://picsum.photos/seed/premium${i}/600/400`,
    status: "VACANT" as const,
  })),
];

async function getRooms() {
  try {
    const rooms = await db.room.findMany({
      include: {
        photos: { orderBy: { sortOrder: "asc" }, take: 1 },
        amenities: { include: { amenity: true }, take: 5 },
      },
      orderBy: [{ type: "asc" }, { roomNumber: "asc" }],
    });

    if (rooms.length === 0) return STATIC_ROOMS;

    return rooms.map((r) => ({
      // Use roomNumber as the URL slug so /rooms/S101 always resolves correctly
      id: r.roomNumber,
      roomNumber: r.roomNumber,
      type: r.type as "STUDIO" | "PREMIUM",
      basePriceSingle: r.basePriceSingle.toNumber(),
      basePriceDouble: r.basePriceDouble.toNumber(),
      features: r.amenities.map((a) => a.amenity.name),
      image: r.photos[0]?.url ?? `https://picsum.photos/seed/${r.roomNumber}/600/400`,
      status: r.status as "VACANT" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED",
    }));
  } catch {
    // DB not reachable (cold start, no seed) — use static fallback
    return STATIC_ROOMS;
  }
}

export default async function RoomsPage() {
  const ROOMS = await getRooms();
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
            <Link href={`/rooms/${room.id}`} key={room.id} className="block">
              <RoomCard
                roomNumber={room.roomNumber}
                roomType={room.type}
                price={room.basePriceDouble}
                status={room.status}
                thumbnail={room.image}
                features={room.features}
                className="bg-white h-full"
              />
            </Link>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 p-6 bg-accent/20 rounded-2xl">
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-primary">{ROOMS.length}</div>
            <div className="text-sm text-muted">Total Rooms</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-vacant">
              {ROOMS.filter((r) => r.status === "VACANT").length}
            </div>
            <div className="text-sm text-muted">Currently Available</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-secondary">
              {ROOMS.filter((r) => r.type === "PREMIUM").length}
            </div>
            <div className="text-sm text-muted">Premium Rooms</div>
          </div>
        </div>
      </div>
    </div>
  );
}
