// ─── UI Primitives ─────────────────────────────────────────────────────────────
export { SignaturePad } from "./components/SignaturePad";
export { Button, buttonVariants } from "./components/ui/button";
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "./components/ui/card";
export { Input } from "./components/ui/input";
export { Label } from "./components/ui/label";
export { Badge, badgeVariants } from "./components/ui/badge";
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator } from "./components/ui/select";
export { Dialog, DialogPortal, DialogOverlay, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "./components/ui/dialog";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption } from "./components/ui/table";
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem as DropdownMenuItemWrapper, DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuRadioGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut } from "./components/ui/dropdown-menu";
export { Avatar, AvatarImage, AvatarFallback } from "./components/ui/avatar";
export { Progress } from "./components/ui/progress";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/ui/tooltip";
export { Skeleton } from "./components/ui/skeleton";
export { Switch } from "./components/ui/switch";
export { Separator } from "./components/ui/separator";
export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "./components/ui/form";
export { SlotElement } from "./components/ui/slot";

// ─── Layout ──────────────────────────────────────────────────────────────────
export { AppShell } from "./components/layout/AppShell";
export { DashboardHeader } from "./components/layout/DashboardHeader";
export { PortalSidebar } from "./components/layout/PortalSidebar";
export type { NavItem } from "./components/layout/PortalSidebar";
export { MobileBottomNav } from "./components/layout/MobileBottomNav";
export { PageHeader } from "./components/layout/PageHeader";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export { StatCard } from "./components/dashboard/StatCard";
export { DataTable } from "./components/dashboard/DataTable";
export type { ColumnDef } from "@tanstack/react-table";
export { SearchInput } from "./components/dashboard/SearchInput";
export { FilterBar } from "./components/dashboard/FilterBar";
export { EmptyState } from "./components/dashboard/EmptyState";
export { ConfirmDialog } from "./components/dashboard/ConfirmDialog";
export { ToastProvider, useToast } from "./components/dashboard/ToastProvider";
export { LoadingSpinner, LoadingOverlay } from "./components/dashboard/LoadingSpinner";
export { StatusBadge } from "./components/dashboard/StatusBadge";
export { ExportButton } from "./components/dashboard/ExportButton";

// ─── Hotel ────────────────────────────────────────────────────────────────────
export { RoomCard } from "./components/hotel/RoomCard";
export { PriceDisplay } from "./components/hotel/PriceDisplay";
export { AvailabilityCalendar } from "./components/hotel/AvailabilityCalendar";
export { BookingStatusTimeline } from "./components/hotel/BookingStatusTimeline";
export { GuestAvatar } from "./components/hotel/GuestAvatar";
export { DocumentPreview } from "./components/hotel/DocumentPreview";
export { PaymentSummary } from "./components/hotel/PaymentSummary";
export { OfferBanner } from "./components/hotel/OfferBanner";
export { RoomTypeBadge } from "./components/hotel/RoomTypeBadge";
export { StatusIndicator } from "./components/hotel/StatusIndicator";

// ─── Provider ────────────────────────────────────────────────────────────────
export { TheRoomsProvider } from "./providers/TheRoomsProvider";

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useDebounce } from "./hooks/useDebounce";
export { useLocalStorage } from "./hooks/useLocalStorage";
export { usePagination } from "./hooks/usePagination";
// useToast is exported via ToastProvider above
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop, useBreakpoint } from "./hooks/useMediaQuery";

// ─── Utils ─────────────────────────────────────────────────────────────────────
export { cn } from "./lib/utils";
export {
  formatCurrency,
  formatDate,
  formatPhone,
  getInitials,
  truncate,
  BOOKING_STATUS_VARIANT,
  ROOM_STATUS_VARIANT,
  PAYMENT_STATUS_VARIANT,
} from "./lib/utils";
export type { BookingStatus, RoomStatus, PaymentStatus } from "./lib/utils";
