"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@the-rooms/ui";

export default function RoomGallery({ photos, roomNumber }: { photos: string[]; roomNumber: string }) {
  const [current, setCurrent] = useState(0);
  const prev = () => setCurrent((p) => (p - 1 + photos.length) % photos.length);
  const next = () => setCurrent((p) => (p + 1) % photos.length);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
      <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl overflow-hidden bg-accent">
        <Image
          src={photos[current]}
          alt={`Room ${roomNumber} — photo ${current + 1}`}
          fill
          className="object-cover"
          priority={current === 0}
        />

        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-primary hover:bg-white flex items-center justify-center transition-colors"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm text-primary hover:bg-white flex items-center justify-center transition-colors"
              aria-label="Next photo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={cn("w-2 h-2 rounded-full transition-colors", i === current ? "bg-white" : "bg-white/40")}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {photos.length > 1 && (
        <div className="grid grid-cols-3 gap-3 mt-4">
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                "relative h-24 rounded-xl overflow-hidden border-2 transition-all",
                i === current ? "border-secondary" : "border-transparent hover:border-secondary/30"
              )}
            >
              <Image src={photo} alt={`Thumbnail ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
