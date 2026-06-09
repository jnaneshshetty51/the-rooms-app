import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { RoomCard } from "@the-rooms/ui";
import { db } from "@the-rooms/db";

export const revalidate = 60; // ISR: refresh room data every minute

export const metadata: Metadata = {
  title: "Rooms",
  description: "Browse our Studio and Premium rooms. Find your perfect space for daily or monthly stays.",
};

// Room type definitions with shared images and features
const ROOM_TYPE_DATA = {
  STUDIO: {
    id: "STUDIO",
    roomNumber: "Studio",
    type: "STUDIO" as const,
    basePriceSingle: 999,
    basePriceDouble: 1799,
    features: ["Queen Bed", "Work Desk", "WiFi", "AC", "Hot Water"],
    image: `/room-placeholder.svg`,
    description: "Comfortable and functional, our Studio rooms are perfect for solo travelers or couples looking for a cozy space with all the essentials.",
  },
  PREMIUM: {
    id: "PREMIUM",
    roomNumber: "Premium",
    type: "PREMIUM" as const,
    basePriceSingle: 1999,
    basePriceDouble: 2999,
    features: ["King Bed", "Mini Bar", "City View", "Room Service", "Work Desk"],
    image: `/room-placeholder.svg`,
    description: "Spacious and elegantly designed, our Premium rooms offer superior comfort with premium amenities and beautiful city views.",
  },
};

interface RoomTypeInfo {
  id: string;
  roomNumber: string;
  type: "STUDIO" | "PREMIUM";
  basePriceSingle: number;
  basePriceDouble: number;
  features: string[];
  image: string;
  description: string;
  vacantCount: number;
  totalCount: number;
}

async function getRoomTypes(): Promise<RoomTypeInfo[]> {
  try {
    type TypeProfile = { type: string; description: string | null; features: string[]; images: { url: string }[] };
    const dbAny = db as unknown as Record<string, { findMany: (args: unknown) => Promise<unknown> }>;
    const [rooms, rawProfiles] = await Promise.all([
      db.room.findMany({
        select: { type: true, status: true, basePriceSingle: true, basePriceDouble: true },
        orderBy: [{ type: "asc" as const }, { roomNumber: "asc" as const }],
      }),
      dbAny.roomTypeProfile.findMany({
        include: { images: { orderBy: { sortOrder: "asc" } } },
      }),
    ]);
    const typeProfiles = rawProfiles as TypeProfile[];

    const profileMap = Object.fromEntries(typeProfiles.map((p) => [p.type, p]));

    if (rooms.length === 0) {
      return [
        { ...ROOM_TYPE_DATA.STUDIO, vacantCount: 24, totalCount: 24 },
        { ...ROOM_TYPE_DATA.PREMIUM, vacantCount: 12, totalCount: 12 },
      ];
    }

    const studioRooms = rooms.filter((r) => r.type === "STUDIO");
    const premiumRooms = rooms.filter((r) => r.type === "PREMIUM");
    const studioSample = studioRooms[0];
    const premiumSample = premiumRooms[0];

    return [
      {
        id: "STUDIO",
        roomNumber: "Studio",
        type: "STUDIO" as const,
        basePriceSingle: studioSample.basePriceSingle.toNumber(),
        basePriceDouble: studioSample.basePriceDouble.toNumber(),
        features: profileMap["STUDIO"]?.features?.length
          ? profileMap["STUDIO"].features
          : ROOM_TYPE_DATA.STUDIO.features,
        image: profileMap["STUDIO"]?.images[0]?.url ?? `/room-placeholder.svg`,
        description: profileMap["STUDIO"]?.description ?? ROOM_TYPE_DATA.STUDIO.description,
        vacantCount: studioRooms.filter((r) => r.status === "VACANT").length,
        totalCount: studioRooms.length,
      },
      {
        id: "PREMIUM",
        roomNumber: "Premium",
        type: "PREMIUM" as const,
        basePriceSingle: premiumSample.basePriceSingle.toNumber(),
        basePriceDouble: premiumSample.basePriceDouble.toNumber(),
        features: profileMap["PREMIUM"]?.features?.length
          ? profileMap["PREMIUM"].features
          : ROOM_TYPE_DATA.PREMIUM.features,
        image: profileMap["PREMIUM"]?.images[0]?.url ?? `/room-placeholder.svg`,
        description: profileMap["PREMIUM"]?.description ?? ROOM_TYPE_DATA.PREMIUM.description,
        vacantCount: premiumRooms.filter((r) => r.status === "VACANT").length,
        totalCount: premiumRooms.length,
      },
    ];
  } catch {
    return [
      { ...ROOM_TYPE_DATA.STUDIO, vacantCount: 24, totalCount: 24 },
      { ...ROOM_TYPE_DATA.PREMIUM, vacantCount: 12, totalCount: 12 },
    ];
  }
}

export default async function RoomsPage() {
  const ROOM_TYPES = await getRoomTypes();
  const totalVacant = ROOM_TYPES.reduce((sum, r) => sum + r.vacantCount, 0);
  const totalRooms = ROOM_TYPES.reduce((sum, r) => sum + r.totalCount, 0);

  return (
    <div className="pt-20">
      {/* Header */}
      <div className="bg-primary text-white py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Our Rooms</h1>
          <p className="text-white/70 text-lg max-w-2xl">
            Choose from our Studio and Premium room categories. All rooms include complimentary breakfast, WiFi, and daily housekeeping.
          </p>
        </div>
      </div>

      {/* Filter& Grid */}
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
              {filter === "ALL" ? "All Rooms" : filter === "STUDIO" ? `Studio (${ROOM_TYPES.find(r => r.type === "STUDIO")?.totalCount ?? 18})` : `Premium (${ROOM_TYPES.find(r => r.type === "PREMIUM")?.totalCount ?? 18})`}
            </Link>
          ))}
        </div>

        {/* Room Type Grid */}
        <div className="grid sm:grid-cols-2 gap-8">
          {ROOM_TYPES.map((roomType) => (
            <Link href={`/rooms/${roomType.id}`} key={roomType.id} className="block">
              <RoomCard
                roomNumber={roomType.roomNumber}
                roomType={roomType.type}
                price={roomType.basePriceDouble}
                status={roomType.vacantCount > 0 ? "VACANT" : "OCCUPIED"}
                thumbnail={roomType.image}
                features={roomType.features}
                className="bg-white h-full"
              />
            </Link>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 p-6 bg-accent/20 rounded-2xl">
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-primary">{totalRooms}</div>
            <div className="text-sm text-muted">Total Rooms</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-vacant">{totalVacant}</div>
            <div className="text-sm text-muted">Currently Available</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-3xl font-bold text-secondary">2</div>
            <div className="text-sm text-muted">Room Categories</div>
          </div>
        </div>
      </div>
    </div>
  );
}
