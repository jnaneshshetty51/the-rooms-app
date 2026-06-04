import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Calendar } from "lucide-react";
import { cn } from "@the-rooms/ui";
import { db } from "@the-rooms/db";
import RoomGallery from "./RoomGallery";

export const revalidate = 60;

async function getRoom(roomNumber: string) {
  try {
    const room = await db.room.findFirst({
      where: { roomNumber },
      include: {
        photos: { orderBy: { sortOrder: "asc" } },
        amenities: { include: { amenity: true } },
      },
    });
    return room;
  } catch {
    return null;
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;
  const roomNumber = decodeURIComponent(id);
  const isStudio = roomNumber.startsWith("S");
  return {
    title: `${isStudio ? "Studio" : "Premium"} Room ${roomNumber} | The Rooms`,
    description: `Book ${isStudio ? "Studio" : "Premium"} Room ${roomNumber} at The Rooms. ${isStudio ? "From ₹999/night" : "From ₹1,999/night"}.`,
  };
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roomNumber = decodeURIComponent(id);
  const dbRoom = await getRoom(roomNumber);

  // Build a unified room object (real DB data or static fallback)
  const isStudio = roomNumber.startsWith("S");
  const room = dbRoom
    ? {
        roomNumber: dbRoom.roomNumber,
        type: dbRoom.type as "STUDIO" | "PREMIUM",
        basePriceSingle: dbRoom.basePriceSingle.toNumber(),
        basePriceDouble: dbRoom.basePriceDouble.toNumber(),
        description:
          dbRoom.type === "STUDIO"
            ? "A thoughtfully designed Studio room with premium amenities. Features a comfortable queen-size bed, dedicated work desk with high-speed WiFi, split AC, and a modern bathroom with hot water."
            : "A spacious Premium room with city views and luxury amenities. Features a king-size bed, mini bar, room service, split AC, and a large modern bathroom.",
        features: dbRoom.amenities.map((a) => a.amenity.name),
        photos:
          dbRoom.photos.length > 0
            ? dbRoom.photos.map((p) => p.url)
            : [
                `https://picsum.photos/seed/${roomNumber}a/800/600`,
                `https://picsum.photos/seed/${roomNumber}b/800/600`,
                `https://picsum.photos/seed/${roomNumber}c/800/600`,
              ],
      }
    : {
        // Static fallback for unseeded DB
        roomNumber,
        type: (isStudio ? "STUDIO" : "PREMIUM") as "STUDIO" | "PREMIUM",
        basePriceSingle: isStudio ? 999 : 1999,
        basePriceDouble: isStudio ? 1799 : 2999,
        description: isStudio
          ? "A thoughtfully designed Studio room with premium amenities. Features a comfortable queen-size bed, dedicated work desk with high-speed WiFi, split AC, and a modern bathroom with hot water."
          : "A spacious Premium room with city views and luxury amenities. Features a king-size bed, mini bar, room service, and a large modern bathroom.",
        features: isStudio
          ? ["WiFi 100 Mbps", "Split AC", "Hot Water 24/7", "Work Desk", "Queen Bed", "Electronic Safe", "Smart TV"]
          : ["King Bed", "Mini Bar", "City View", "Room Service", "Split AC", "Smart TV", "Work Desk"],
        photos: [
          `https://picsum.photos/seed/${roomNumber}a/800/600`,
          `https://picsum.photos/seed/${roomNumber}b/800/600`,
          `https://picsum.photos/seed/${roomNumber}c/800/600`,
        ],
      };

  // 404 only when it looks like a real DB ID that doesn't exist in DB and isn't a known room number pattern
  const looksLikeRoomNumber = /^[SP]\d{3}$/.test(roomNumber);
  if (!dbRoom && !looksLikeRoomNumber) notFound();

  return (
    <div className="pt-20">
      {/* Back */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Link href="/rooms" className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary transition-colors">
          ← Back to Rooms
        </Link>
      </div>

      {/* Interactive photo gallery (Client Component) */}
      <RoomGallery photos={room.photos} roomNumber={room.roomNumber} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
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
                The Rooms Hotel, 103/2, Uniworld, Neeladri Road, Electronic City Phase 1, Bangalore, Karnataka 560100
              </div>
            </div>

            <div>
              <h2 className="font-heading text-lg font-bold text-primary mb-2">About This Room</h2>
              <p className="text-muted leading-relaxed">{room.description}</p>
            </div>

            {room.features.length > 0 && (
              <div>
                <h2 className="font-heading text-lg font-bold text-primary mb-3">Room Features</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {room.features.map((feature) => (
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
                  <span className="font-semibold">₹{room.basePriceSingle.toLocaleString("en-IN")}/night</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted">Double Occupancy</span>
                  <span className="font-semibold">₹{room.basePriceDouble.toLocaleString("en-IN")}/night</span>
                </div>
                <div className="text-xs text-muted border-t pt-2">All prices include 18% GST</div>
              </div>

              <Link
                href={`/book?type=${room.type}`}
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
