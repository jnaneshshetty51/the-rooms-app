"use client";

import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn, getInitials } from "../../lib/utils";

interface GuestAvatarProps {
  name: string;
  image?: string;
  isOnline?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export function GuestAvatar({ name, image, isOnline, size = "md", className }: GuestAvatarProps) {
  return (
    <div className={cn("relative inline-block", className)}>
      <Avatar className={SIZE_CLASSES[size]}>
        <AvatarImage src={image} alt={name} />
        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
      {isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-card",
            isOnline ? "bg-success" : "bg-muted",
            size === "sm" || size === "md" ? "h-2 w-2" : "h-3 w-3"
          )}
        />
      )}
    </div>
  );
}
