"use client";

// apps/admin/src/app/(dashboard)/bookings/page.tsx
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Filter, CalendarDays, Eye, XCircle } from "lucide-react";
import { PageHeader, Button, StatusBadge, Select, SelectTrigger, SelectContent, SelectValue, Input, DataTable, type ColumnDef } from "@the-rooms/ui";
import { formatCurrency, formatDate } from "@the-rooms/ui";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  bookingType: string;
  bookingSource: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  guestsCount: number;
  guest: { name: string; phone: string; email: string | null };
  room: { id: string; roomNumber: string; type: string };
  payments: { id: string; amount: string; status: string; method: string }[];
  createdBy: { name: string | null } | null;
}

interface BookingsResponse {
  bookings: Booking[];
  total: number;
  pages: number;
  page: number;
}

export default function BookingsPage() {
  const router = useRouter();
  const [data, setData] = useState<BookingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    paymentStatus: "ALL",
    bookingSource: "ALL",
    bookingType: "ALL",
    checkInFrom: "",
    checkInTo: "",
    page: 1,
  });

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status !== "ALL") params.set("status", filters.status);
    if (filters.paymentStatus !== "ALL") params.set("paymentStatus", filters.paymentStatus);
    if (filters.bookingSource !== "ALL") params.set("bookingSource", filters.bookingSource);
    if (filters.bookingType !== "ALL") params.set("bookingType", filters.bookingType);
    if (filters.checkInFrom) params.set("checkInFrom", filters.checkInFrom);
    if (filters.checkInTo) params.set("checkInTo", filters.checkInTo);
    params.set("page", String(filters.page));

    const res = await fetch(`/api/bookings?${params}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [filters]);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);

  const columns: ColumnDef<Booking, unknown>[] = [
    {
      accessorKey: "bookingNumber",
      header: "Booking ID",
      cell: ({ row }) => (
        <span className="font-mono text-sm font-semibold">{row.original.bookingNumber}</span>
      ),
    },
    {
      accessorKey: "guest.name",
      header: "Guest",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-sm">{row.original.guest.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.guest.phone}</p>
        </div>
      ),
    },
    {
      accessorKey: "room.roomNumber",
      header: "Room",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">Room {row.original.room.roomNumber}</p>
          <p className="text-xs text-muted-foreground">{row.original.room.type}</p>
        </div>
      ),
    },
    {
      accessorKey: "checkIn",
      header: "Check-in",
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.checkIn, "short")}</span>,
    },
    {
      accessorKey: "checkOut",
      header: "Check-out",
      cell: ({ row }) => <span className="text-sm">{formatDate(row.original.checkOut, "short")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status as "CONFIRMED"} type="booking" />,
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus as "PAID"} type="payment" />,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-semibold text-sm">{formatCurrency(Number(row.original.totalAmount))}</span>
      ),
    },
    {
      accessorKey: "bookingSource",
      header: "Source",
      cell: ({ row }) => (
        <span className="text-xs px-2 py-1 rounded-full bg-secondary/20 text-secondary-foreground">
          {row.original.bookingSource.replace("_", " ")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/bookings/${row.original.id}`)}
            aria-label="View booking"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {row.original.status === "CONFIRMED" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => handleCancel(row.original.id)}
              aria-label="Cancel booking"
            >
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  async function handleCancel(id: string) {
    if (!confirm("Cancel this booking? The room will be released.")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    fetchBookings();
  }

  function updateFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value, page: 1 }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Booking Management"
        description={`${data?.total ?? 0} total bookings`}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, booking ID…"
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filters.status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
            <span>{filters.status === "ALL" ? "All Status" : filters.status.replace("_", " ")}</span>
          </SelectTrigger>
          <SelectContent>
            <option value="ALL">All Status</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="NO_SHOW">No Show</option>
          </SelectContent>
        </Select>
        <Select value={filters.paymentStatus} onValueChange={(v) => updateFilter("paymentStatus", v)}>
          <SelectTrigger className="w-[150px]">
            <span>{filters.paymentStatus === "ALL" ? "All Payment" : filters.paymentStatus}</span>
          </SelectTrigger>
          <SelectContent>
            <option value="ALL">All Payment</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="REFUNDED">Refunded</option>
            <option value="FAILED">Failed</option>
          </SelectContent>
        </Select>
        <Select value={filters.bookingSource} onValueChange={(v) => updateFilter("bookingSource", v)}>
          <SelectTrigger className="w-[130px]">
            <span>{filters.bookingSource === "ALL" ? "All Source" : filters.bookingSource}</span>
          </SelectTrigger>
          <SelectContent>
            <option value="ALL">All Source</option>
            <option value="WEBSITE">Website</option>
            <option value="WALK_IN">Walk-in</option>
            <option value="PHONE">Phone</option>
            <option value="OTA">OTA</option>
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="w-[160px]"
          value={filters.checkInFrom}
          onChange={(e) => updateFilter("checkInFrom", e.target.value)}
          placeholder="From date"
        />
        <Input
          type="date"
          className="w-[160px]"
          value={filters.checkInTo}
          onChange={(e) => updateFilter("checkInTo", e.target.value)}
          placeholder="To date"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.bookings ?? []}
        isLoading={loading}
        pageSize={20}
        filterPlaceholder="Filter bookings…"
      />

      {/* Pagination info */}
      {data && (
        <div className="text-sm text-muted-foreground text-center">
          Page {data.page} of {data.pages} — {data.total} total bookings
        </div>
      )}
    </div>
  );
}
