"use client";

import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface OfferBannerProps {
  title: string;
  subtitle?: string;
  image?: string;
  cta?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function OfferBanner({ title, subtitle, image, cta, className }: OfferBannerProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden min-h-[200px] flex items-center",
        className
      )}
    >
      {/* Background */}
      {image ? (
        <img src={image} alt={title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary" />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />

      {/* Content */}
      <CardContent className="relative z-10 text-white p-6 md:p-8">
        <h3 className="font-heading text-xl md:text-2xl font-bold mb-1">{title}</h3>
        {subtitle && <p className="text-sm text-white/80 mb-4 max-w-sm">{subtitle}</p>}
        {cta && (
          <Button
            variant="secondary"
            size="sm"
            className="bg-white text-primary hover:bg-white/90 active:scale-[0.98]"
            onClick={cta.onClick}
          >
            {cta.label}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
