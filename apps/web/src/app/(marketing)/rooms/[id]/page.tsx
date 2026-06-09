import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { db } from "@the-rooms/db";
import RoomGallery from "./RoomGallery";

export const revalidate = 60;

// Fallback content when RoomTypeProfile has no data yet
const ROOM_TYPE_FALLBACK = {
  STUDIO: {
    description: "A thoughtfully designed Studio room with premium amenities. Features a comfortable queen-size bed, dedicated work desk with high-speed WiFi, split AC, and a modern bathroom with hot water.",
    features: ["WiFi 100 Mbps", "Split AC", "Hot Water 24/7", "Work Desk", "Queen Bed", "Electronic Safe", "Smart TV"],
  },
  PREMIUM: {
    description: "A spacious Premium room with city views and luxury amenities. Features a king-size bed, mini bar, room service, split AC, and a large modern bathroom.",
    features: ["King Bed", "Mini Bar", "City View", "Room Service", "Split AC", "Smart TV", "Work Desk"],
  },
};

type RoomTypeProfile = {
  title: string;
  description: string | null;
  features: string[];
  images: { url: string }[];
};

async function getRoomTypeData(type: "STUDIO" | "PREMIUM") {
  try {
    const dbAny = db as unknown as Record<string, { findUnique: (args: unknown) => Promise<unknown> }>;
    const [rooms, profile] = await Promise.all([
      db.room.findMany({
        where: { type },
        select: { status: true, basePriceSingle: true, basePriceDouble: true },
      }),
      dbAny.roomTypeProfile.findUnique({
        where: { type },
        include: { images: { orderBy: { sortOrder: "asc" } } },
      }) as Promise<RoomTypeProfile | null>,
    ]);

    const fallback = ROOM_TYPE_FALLBACK[type];
    const sampleRoom = rooms[0];
    const vacantCount = rooms.filter((r) => r.status === "VACANT").length;

    return {
      basePriceSingle: sampleRoom?.basePriceSingle.toNumber() ?? (type === "STUDIO" ? 999 : 1999),
      basePriceDouble: sampleRoom?.basePriceDouble.toNumber() ?? (type === "STUDIO" ? 1799 : 2999),
      description: profile?.description ?? fallback.description,
      features: profile?.features?.length ? profile.features : fallback.features,
      photos: profile?.images?.length ? profile.images.map((i) => i.url) : ["/room-placeholder.svg"],
      vacantCount,
      totalCount: rooms.length,
    };
  } catch {
    const fallback = ROOM_TYPE_FALLBACK[type];
    return {
      basePriceSingle: type === "STUDIO" ? 999 : 1999,
      basePriceDouble: type === "STUDIO" ? 1799 : 2999,
      description: fallback.description,
      features: fallback.features,
      photos: ["/room-placeholder.svg"],
      vacantCount: type === "STUDIO" ? 24 : 12,
      totalCount: type === "STUDIO" ? 24 : 12,
    };
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const roomType = decodeURIComponent(id);
  const isStudio = roomType === "STUDIO";
  return {
    title: `${isStudio ? "Studio" : "Premium"} Room | The Rooms`,
    description: `Book our ${isStudio ? "Studio" : "Premium"} rooms at The Rooms. ${isStudio ? "From ₹999/night" : "From ₹1,999/night"}.`,
  };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roomTypeId = decodeURIComponent(id);

  // Handle room type IDs (STUDIO, PREMIUM)
  if (roomTypeId === "STUDIO" || roomTypeId === "PREMIUM") {
    const roomData = await getRoomTypeData(roomTypeId as "STUDIO" | "PREMIUM");
    const isStudio = roomTypeId === "STUDIO";

    return (
      <div className="pt-20">
        {/* Back */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/rooms" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors">
            ← Back to Rooms
          </Link>
        </div>

        {/* Interactive photo gallery (Client Component) */}
        <RoomGallery photos={roomData.photos} roomNumber={roomTypeId} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    isStudio ? "bg-primary text-primary-foreground" : "bg-secondary text-white"
                  )}>
                    {roomTypeId}
                  </span>
                  <span className="text-sm text-muted">{roomData.totalCount} rooms available</span>
                </div>
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-primary mb-3">
                  {isStudio ? "Studio Room" : "Premium Room"}
                </h1>
                <div className="flex items-center gap-1 text-sm text-muted">
                  <MapPin className="w-4 h-4" />
                  The Rooms Hotel, 103/2, Uniworld, Neeladri Road, Electronic City Phase 1, Bangalore, Karnataka 560100
                </div>
              </div>

              <div>
                <h2 className="font-heading text-lg font-bold text-primary mb-2">About This Room</h2>
                <p className="text-muted leading-relaxed">{roomData.description}</p>
              </div>

              {roomData.features.length > 0 && (
                <div>
                  <h2 className="font-heading text-lg font-bold text-primary mb-3">Room Features</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {roomData.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-3 p-3 bg-white rounded-xl border">
                        <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
                        <span className="text-sm font-medium text-primary">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border shadow-sm p-6 sticky top-24">
                <h3 className="font-heading text-lg font-bold text-primary mb-4">Pricing</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Single Occupancy</span>
                    <span className="font-semibold">₹{roomData.basePriceSingle.toLocaleString("en-IN")}/night</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted">Double Occupancy</span>
                    <span className="font-semibold">₹{roomData.basePriceDouble.toLocaleString("en-IN")}/night</span>
                  </div>
                  <div className="text-xs text-muted border-t pt-2">All prices include 18% GST</div>
                </div>

                <Link
                  href={`/book?type=${roomTypeId}`}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-secondary text-white font-bold rounded-xl hover:bg-secondary/90 transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Book This Room
                </Link>

                <p className="mt-4 text-center text-xs text-muted">
                  Free cancellation up to 48h before check-in
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For backwards compatibility, handle old room number URLs
  notFound();
}
