"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@the-rooms/ui";
import { Bed, Users, Wrench, Lock, Loader2, RefreshCw, Sparkles, Trash2, Clock, Bell, ChevronLeft, ChevronRight, Calendar, X, Plus, Search, Check, AlertCircle } from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface CurrentBooking {
  id: string;
  bookingNumber: string | null;
  guestName: string;
  guestPhone: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
  arrivingToday: boolean;
  departingToday: boolean;
}

interface RoomEntry {
  id: string;
  roomNumber: string;
  type: "STUDIO" | "PREMIUM";
  floor: number;
  status: "VACANT" | "BOOKED" | "OCCUPIED" | "MAINTENANCE" | "BLOCKED";
  cleaningStatus: "CLEAN" | "DIRTY" | "CLEANING";
  currentBooking: CurrentBooking | null;
}

interface RoomBoardData {
  rooms: RoomEntry[];
  totalRooms: number;
  vacant: number;
  booked: number;
  occupied: number;
  maintenance: number;
  arrivingToday: number;
  departingToday: number;
  selectedDate: string;
  isToday: boolean;
}

interface GuestSearchResult {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface ReservationFormData {
  roomId: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guestId?: string;
  guest: {
    name: string;
    phone: string;
    email: string;
  };
  guestsCount: number;
  bookingSource: string;
  specialRequests: string;
}

interface AvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  overlappingBooking?: {
    id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
  };
}

interface PricingResult {
  baseAmount: number;
  discountAmount: number;
  extrasAmount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  nights: number;
  nightlyRate: number;
  bookingType: string;
  rateLabel: string;
  extraGuestCharge: number;
}

const STATUS_CONFIG = {
  VACANT: { label: "Vacant", bgColor: "bg-green-100", borderColor: "border-green-300", textColor: "text-green-800", icon: Bed },
  BOOKED: { label: "Booked", bgColor: "bg-purple-100", borderColor: "border-purple-300", textColor: "text-purple-800", icon: Lock },
  OCCUPIED: { label: "Occupied", bgColor: "bg-blue-100", borderColor: "border-blue-300", textColor: "text-blue-800", icon: Users },
  MAINTENANCE: { label: "Maintenance", bgColor: "bg-yellow-100", borderColor: "border-yellow-300", textColor: "text-yellow-800", icon: Wrench },
  BLOCKED: { label: "Blocked", bgColor: "bg-gray-100", borderColor: "border-gray-300", textColor: "text-gray-800", icon: Lock },
};

const BOOKING_SOURCES = [
  { value: "FRONT_DESK", label: "Front Desk" },
  { value: "PHONE", label: "Phone" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "CORPORATE", label: "Corporate" },
  { value: "OTA", label: "OTA" },
];

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getTomorrowString() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
}

export default function RoomBoardPage() {
  const [data, setData] = useState<RoomBoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [selectedRoom, setSelectedRoom] = useState<RoomEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Quick reservation modal state
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [reservationRoom, setReservationRoom] = useState<RoomEntry | null>(null);
  const [formData, setFormData] = useState<ReservationFormData>({
    roomId: '',
    roomNumber: '',
    checkIn: getTodayString(),
    checkOut: getTomorrowString(),
    guest: { name: '', phone: '', email: '' },
    guestsCount: 1,
    bookingSource: 'FRONT_DESK',
    specialRequests: '',
  });
  const [guestSearch, setGuestSearch] = useState('');
  const [guestSearchResults, setGuestSearchResults] = useState<GuestSearchResult[]>([]);
  const [searchingGuests, setSearchingGuests] = useState(false);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [calculatingPricing, setCalculatingPricing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRoomBoard = useCallback(async (date?: string) => {
    try {
      const dateParam = date || selectedDate;
      const url = `/api/rooms/board?date=${dateParam}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (date) setSelectedDate(date);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchRoomBoard(); }, [fetchRoomBoard]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchRoomBoard(selectedDate), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRoomBoard, selectedDate]);

  const handleDateChange = (newDate: string) => {
    setLoading(true);
    fetchRoomBoard(newDate);
  };

  const handleToday = () => {
    const today = getTodayString();
    setLoading(true);
    fetchRoomBoard(today);
  };

  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setLoading(true);
    fetchRoomBoard(newDate);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    const newDate = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
    setLoading(true);
    fetchRoomBoard(newDate);
  };

  // Open reservation modal for a vacant room
  const openReservationModal = (room: RoomEntry) => {
    setReservationRoom(room);
    setFormData({
      roomId: room.id,
      roomNumber: room.roomNumber,
      checkIn: selectedDate,
      checkOut: getTomorrowString(),
      guest: { name: '', phone: '', email: '' },
      guestsCount: 1,
      bookingSource: 'FRONT_DESK',
      specialRequests: '',
    });
    setGuestSearch('');
    setGuestSearchResults([]);
    setAvailability(null);
    setPricing(null);
    setError(null);
    setSuccess(null);
    setShowReservationModal(true);
  };

  // Search guests
  const searchGuests = async (query: string) => {
    if (query.length < 2) {
      setGuestSearchResults([]);
      return;
    }
    setSearchingGuests(true);
    try {
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setGuestSearchResults(data.guests || []);
      }
    } catch (err) {
      console.error('Guest search error:', err);
    } finally {
      setSearchingGuests(false);
    }
  };

  // Handle guest selection from search
  const selectGuest = (guest: GuestSearchResult) => {
    setFormData(prev => ({
      ...prev,
      guestId: guest.id,
      guest: {
        name: guest.name,
        phone: guest.phone || '',
        email: guest.email || '',
      },
    }));
    setGuestSearch(guest.name);
    setGuestSearchResults([]);
  };

  // Clear guest selection
  const clearGuest = () => {
    setFormData(prev => ({
      ...prev,
      guestId: undefined,
      guest: { name: '', phone: '', email: '' },
    }));
    setGuestSearch('');
  };

  // Check availability
  const checkAvailability = async () => {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) {
      setError('Please fill in all required fields');
      return;
    }
    setCheckingAvailability(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations?roomId=${formData.roomId}&checkIn=${formData.checkIn}&checkOut=${formData.checkOut}`);
      const data = await res.json();
      setAvailability(data);
      if (data.isAvailable) {
        // Calculate pricing if available
        calculatePricing();
      }
    } catch (err) {
      setError('Failed to check availability');
    } finally {
      setCheckingAvailability(false);
    }
  };

  // Calculate pricing
  const calculatePricing = async () => {
    setCalculatingPricing(true);
    try {
      // For now, we'll calculate on the server when submitting
      // This is a placeholder for real-time pricing calculation
    } catch (err) {
      console.error('Pricing error:', err);
    } finally {
      setCalculatingPricing(false);
    }
  };

  // Submit reservation
  const submitReservation = async () => {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut || !formData.guest.name || !formData.guest.phone) {
      setError('Please fill in all required fields (Guest name and phone are required)');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: formData.roomId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          guest: formData.guestId ? undefined : {
            name: formData.guest.name,
            phone: formData.guest.phone,
            email: formData.guest.email || undefined,
          },
          guestId: formData.guestId,
          guestsCount: formData.guestsCount,
          bookingSource: formData.bookingSource,
          specialRequests: formData.specialRequests || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create reservation');
      }

      setSuccess(`Reservation created successfully! Booking: ${data.booking?.bookingNumber}`);
      setPricing(data.pricing);

      // Refresh the room board after a short delay
      setTimeout(() => {
        setShowReservationModal(false);
        fetchRoomBoard(selectedDate);
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRooms = data?.rooms.filter((room) => {
    if (filter === "all") return true;
    if (filter === "arriving") return room.currentBooking?.arrivingToday;
    if (filter === "departing") return room.currentBooking?.departingToday;
    return room.status === filter.toUpperCase();
  }) ?? [];

  const roomsByFloor = filteredRooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {} as Record<number, RoomEntry[]>);

  const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);
  const occupancyPercent = data?.totalRooms ? Math.round((data.occupied / data.totalRooms) * 100) : 0;

  // Format selected date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading && !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Room Board</h2>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm">
            <span className="text-gray-500">{data?.totalRooms ?? 0} rooms</span>
            <span className="text-gray-300">·</span>
            <span className="font-medium text-blue-600">In-house: {data?.occupied ?? 0} ({occupancyPercent}%)</span>
            {(data?.arrivingToday ?? 0) > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-orange-600">Arriving: {data?.arrivingToday}</span>
              </>
            )}
            {(data?.departingToday ?? 0) > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-medium text-red-600">Departing: {data?.departingToday}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
              autoRefresh ? "border-green-300 bg-green-50 text-green-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
            {autoRefresh ? "Auto" : "Paused"}
          </button>
          <button onClick={() => fetchRoomBoard(selectedDate)} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="flex items-center justify-center gap-2 bg-white rounded-lg border p-2">
        <button
          onClick={handlePrevDay}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Previous day"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-2 px-4">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="text-sm font-medium text-gray-900 border-0 bg-transparent focus:ring-2 focus:ring-[#E17055] rounded px-2 py-1"
          />
          <span className="text-sm text-gray-600">
            {formatDisplayDate(selectedDate)}
          </span>
        </div>

        <button
          onClick={handleNextDay}
          className="p-2 rounded-md hover:bg-gray-100 transition-colors"
          title="Next day"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>

        {!data?.isToday && (
          <button
            onClick={handleToday}
            className="ml-2 px-3 py-1.5 text-sm font-medium text-[#E17055] border border-[#E17055] rounded-md hover:bg-[#E17055] hover:text-white transition-colors"
          >
            Today
          </button>
        )}

        {data?.isToday && (
          <span className="ml-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-md">
            Today
          </span>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
        {([
          { key: "all", label: "All", count: data?.totalRooms ?? 0, colorClass: "text-gray-600", activeRing: "ring-gray-400", activeBg: "bg-gray-50", Icon: Bed },
          { key: "vacant", label: "Vacant", count: data?.vacant ?? 0, colorClass: "text-green-600", activeRing: "ring-green-400", activeBg: "bg-green-50", Icon: Bed },
          { key: "occupied", label: "In-House", count: data?.occupied ?? 0, colorClass: "text-blue-600", activeRing: "ring-blue-400", activeBg: "bg-blue-50", Icon: Users },
          { key: "booked", label: "Booked", count: data?.booked ?? 0, colorClass: "text-purple-600", activeRing: "ring-purple-400", activeBg: "bg-purple-50", Icon: Lock },
          { key: "arriving", label: "Arriving", count: data?.arrivingToday ?? 0, colorClass: "text-orange-600", activeRing: "ring-orange-400", activeBg: "bg-orange-50", Icon: Bell },
          { key: "departing", label: "Departing", count: data?.departingToday ?? 0, colorClass: "text-red-600", activeRing: "ring-red-400", activeBg: "bg-red-50", Icon: Bell },
          { key: "maintenance", label: "Maint.", count: data?.maintenance ?? 0, colorClass: "text-yellow-600", activeRing: "ring-yellow-400", activeBg: "bg-yellow-50", Icon: Wrench },
        ] as const).map(({ key, label, count, colorClass, activeRing, activeBg, Icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all min-h-[120px]",
              filter === key ? `ring-2 ${activeRing} ${activeBg} border-transparent` : "border-gray-200 bg-white hover:border-gray-300"
            )}
          >
            <div className="flex items-center justify-between">
              <Icon className={cn("h-5 w-5", colorClass)} />
              <span className="text-xl font-bold text-gray-900">{count}</span>
            </div>
            <p className={cn("mt-1.5 text-xs font-semibold", colorClass)}>{label}</p>
          </button>
        ))}
      </div>

      {/* Room grid by floor */}
      <div className="space-y-6">
        {floors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
            <p className="text-gray-400">No rooms match this filter.</p>
          </div>
        ) : floors.map((floor) => (
          <div key={floor}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-500">Floor {floor}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {roomsByFloor[floor].map((room) => {
                const config = STATUS_CONFIG[room.status];
                const StatusIcon = config.icon;
                const isSelected = selectedRoom?.id === room.id;
                const arriving = room.currentBooking?.arrivingToday;

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(isSelected ? null : room)}
                    className={cn(
                      "relative rounded-xl border-2 p-3 text-left transition-all min-h-[120px]",
                      arriving ? "border-orange-400 bg-orange-50" : `${config.borderColor} ${config.bgColor}`,
                      isSelected && "ring-2 ring-[#E17055] ring-offset-1"
                    )}
                  >
                    {arriving && (
                      <span className="absolute top-1.5 right-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white uppercase tracking-wide leading-tight">
                        Today
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-base font-bold text-gray-900 leading-tight">{room.roomNumber}</span>
                      <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", arriving ? "text-orange-600" : config.textColor)} />
                    </div>
                    <p className={cn("mt-0.5 text-[10px] font-semibold", arriving ? "text-orange-700" : config.textColor)}>
                      {arriving ? "Arriving" : config.label}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <p className="text-[10px] text-gray-400">{room.type === "PREMIUM" ? "PREM" : "STD"}</p>
                      {room.cleaningStatus === "DIRTY"
                        ? <span title="Dirty"><Trash2 className="h-3 w-3 text-red-500" /></span>
                        : room.cleaningStatus === "CLEANING"
                          ? <span title="Cleaning"><Clock className="h-3 w-3 text-blue-500" /></span>
                          : <span title="Clean"><Sparkles className="h-3 w-3 text-green-500" /></span>
                      }
                    </div>
                    {room.currentBooking && (
                      <div className="mt-1.5 pt-1.5 border-t border-black/5">
                        <p className="text-[10px] font-medium text-gray-900 truncate">{room.currentBooking.guestName}</p>
                        <p className="text-[9px] text-gray-400 leading-tight">
                          {arriving ? `→ ${formatDate(room.currentBooking.checkOut, "short")}` : `Out: ${formatDate(room.currentBooking.checkOut, "short")}`}
                        </p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Room detail popup */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedRoom(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className={cn("p-5 rounded-t-2xl", selectedRoom.currentBooking?.arrivingToday ? "bg-orange-50" : STATUS_CONFIG[selectedRoom.status].bgColor)}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Room {selectedRoom.roomNumber}</h3>
                  <p className="text-sm text-gray-500">{selectedRoom.type} · Floor {selectedRoom.floor}</p>
                </div>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold border",
                  selectedRoom.currentBooking?.arrivingToday
                    ? "bg-orange-100 border-orange-300 text-orange-800"
                    : `${STATUS_CONFIG[selectedRoom.status].bgColor} border ${STATUS_CONFIG[selectedRoom.status].borderColor} ${STATUS_CONFIG[selectedRoom.status].textColor}`
                )}>
                  {selectedRoom.currentBooking?.arrivingToday ? "Arriving Today" : STATUS_CONFIG[selectedRoom.status].label}
                </span>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {selectedRoom.currentBooking ? (
                <>
                  {selectedRoom.currentBooking.bookingNumber && (
                    <div className="rounded-lg bg-gray-50 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Booking</p>
                      <p className="font-mono text-sm font-bold text-gray-900">{selectedRoom.currentBooking.bookingNumber}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Guest</p>
                    <p className="text-base font-semibold text-gray-900">{selectedRoom.currentBooking.guestName}</p>
                    {selectedRoom.currentBooking.guestPhone && (
                      <a href={`tel:${selectedRoom.currentBooking.guestPhone}`} className="text-sm text-blue-600 hover:underline">
                        {selectedRoom.currentBooking.guestPhone}
                      </a>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Check-in</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedRoom.currentBooking.checkIn, "short")}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Check-out</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(selectedRoom.currentBooking.checkOut, "short")}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <a href={`/bookings/${selectedRoom.currentBooking.id}`} className="flex-1 rounded-lg bg-[#E17055] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#D35B3F]">
                      View Booking
                    </a>
                    {selectedRoom.currentBooking.arrivingToday && (
                      <a href={`/bookings/${selectedRoom.currentBooking.id}/check-in`} className="flex-1 rounded-lg bg-green-600 py-2.5 text-center text-sm font-semibold text-white hover:bg-green-700">
                        Check In
                      </a>
                    )}
                    {selectedRoom.status === "OCCUPIED" && (
                      <a href={`/bookings/${selectedRoom.currentBooking.id}/check-out`} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
                        Check Out
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-500 py-2">This room is vacant and available for booking.</p>
                  <button
                    onClick={() => {
                      setSelectedRoom(null);
                      openReservationModal(selectedRoom);
                    }}
                    className="block w-full rounded-lg bg-[#E17055] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#D35B3F]"
                  >
                    Quick Reserve
                  </button>
                  <a href={`/bookings/new?room=${selectedRoom.id}`} className="block w-full rounded-lg border border-gray-300 py-2.5 text-center text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    Full Booking Form
                  </a>
                </>
              )}
            </div>
            <div className="border-t px-5 py-3">
              <button onClick={() => setSelectedRoom(null)} className="w-full rounded-lg border border-gray-200 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Reservation Modal */}
      {showReservationModal && reservationRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Quick Reserve</h3>
                <p className="text-sm text-gray-500">Room {reservationRoom.roomNumber} - {reservationRoom.type}</p>
              </div>
              <button
                onClick={() => setShowReservationModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Success Message */}
            {success && (
              <div className="mx-5 mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">{success}</p>
                  {pricing && (
                    <p className="text-sm text-green-700 mt-1">
                      Total: ₹{pricing.totalAmount.toLocaleString('en-IN')} ({pricing.nights} night{pricing.nights !== 1 ? 's' : ''})
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mx-5 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-in <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkIn}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, checkIn: e.target.value }));
                      setAvailability(null);
                      setPricing(null);
                    }}
                    min={getTodayString()}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check-out <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.checkOut}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, checkOut: e.target.value }));
                      setAvailability(null);
                      setPricing(null);
                    }}
                    min={formData.checkIn || getTodayString()}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Guest Search/Create */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Guest <span className="text-red-500">*</span>
                </label>
                {formData.guestId ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{formData.guest.name}</p>
                      <p className="text-xs text-gray-500">{formData.guest.phone}</p>
                    </div>
                    <button
                      onClick={clearGuest}
                      className="p-1 hover:bg-green-100 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-500" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={guestSearch}
                        onChange={(e) => {
                          setGuestSearch(e.target.value);
                          searchGuests(e.target.value);
                        }}
                        placeholder="Search by name, phone, or email..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                      />
                      {searchingGuests && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                      )}
                    </div>
                    {guestSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {guestSearchResults.map((guest) => (
                          <button
                            key={guest.id}
                            onClick={() => selectGuest(guest)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Users className="h-4 w-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{guest.name}</p>
                              <p className="text-xs text-gray-500">{guest.phone} {guest.email && `· ${guest.email}`}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* New Guest Details (if not selecting existing) */}
              {!formData.guestId && (
                <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Guest Details</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.guest.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, guest: { ...prev.guest, name: e.target.value } }))}
                      placeholder="Full name"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={formData.guest.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest: { ...prev.guest, phone: e.target.value } }))}
                        placeholder="Phone number"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.guest.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, guest: { ...prev.guest, email: e.target.value } }))}
                        placeholder="Email (optional)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Guests Count & Booking Source */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={4}
                    value={formData.guestsCount}
                    onChange={(e) => setFormData(prev => ({ ...prev, guestsCount: parseInt(e.target.value) || 1 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <select
                    value={formData.bookingSource}
                    onChange={(e) => setFormData(prev => ({ ...prev, bookingSource: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                  >
                    {BOOKING_SOURCES.map((source) => (
                      <option key={source.value} value={source.value}>{source.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  value={formData.specialRequests}
                  onChange={(e) => setFormData(prev => ({ ...prev, specialRequests: e.target.value }))}
                  placeholder="Any special requests..."
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                />
              </div>

              {/* Availability Status */}
              {availability && (
                <div className={cn(
                  "p-3 rounded-lg flex items-start gap-3",
                  availability.isAvailable ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                )}>
                  {availability.isAvailable ? (
                    <>
                      <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Room is available!</p>
                        {pricing && (
                          <p className="text-sm text-green-700 mt-1">
                            Total: ₹{pricing.totalAmount.toLocaleString('en-IN')} ({pricing.nights} night{pricing.nights !== 1 ? 's' : ''})
                          </p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Room not available</p>
                        <p className="text-sm text-red-700 mt-1">{availability.reason}</p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={checkAvailability}
                  disabled={checkingAvailability || !formData.checkIn || !formData.checkOut}
                  className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkingAvailability ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Check Availability
                </button>
                <button
                  onClick={submitReservation}
                  disabled={submitting || !availability?.isAvailable}
                  className="flex-1 rounded-lg bg-[#E17055] py-2.5 text-sm font-semibold text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Confirm Reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
