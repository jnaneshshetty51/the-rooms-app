"use client";

import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { getInitials } from "../../lib/utils";

interface DashboardHeaderProps {
  portalName: string;
  userName?: string;
  userImage?: string;
  notificationCount?: number;
  onMenuClick?: () => void;
}

export function DashboardHeader({
  portalName,
  userName = "User",
  userImage,
  notificationCount = 0,
  onMenuClick,
}: DashboardHeaderProps) {
  return (
    <div className="flex h-16 items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-heading text-lg font-semibold text-primary">{portalName}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-5 w-5" />
          </Button>
          {notificationCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-white">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}
        </div>
        <Avatar className="h-8 w-8">
          <AvatarImage src={userImage} alt={userName} />
          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
            {getInitials(userName)}
          </AvatarFallback>
        </Avatar>
      </div>
    </div>
  );
}
