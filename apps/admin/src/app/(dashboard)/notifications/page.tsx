"use client";

// apps/admin/src/app/(dashboard)/notifications/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Bell, Mail, AlertCircle, CheckCircle, Search } from "lucide-react";
import { PageHeader, DataTable, Badge, type ColumnDef } from "@the-rooms/ui";
import { Card, CardContent } from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

interface Notification {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  bookingId: string | null;
  sentAt: string;
  status: string;
}

export default function NotificationsPage() {
  const [data, setData] = useState<{ notifications: Notification[]; total: number; pages: number; page: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/notifications?page=${page}&perPage=50`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = data?.notifications.filter((n) =>
    !search ||
    n.recipient.toLowerCase().includes(search.toLowerCase()) ||
    n.subject.toLowerCase().includes(search.toLowerCase()) ||
    (n.bookingId ?? "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const columns: ColumnDef<Notification, unknown>[] = [
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const icon = row.original.status === "FAILED" ? <AlertCircle className="h-4 w-4 text-destructive" /> : <Mail className="h-4 w-4 text-primary" />;
        const label = row.original.type.replace(/_/g, " ");
        return (
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-xs font-medium uppercase">{label}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "recipient",
      header: "Recipient",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium">{row.original.recipient}</p>
          {row.original.bookingId && (
            <p className="text-xs text-muted-foreground font-mono">#{row.original.bookingId.slice(0, 8)}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "subject",
      header: "Subject / Event",
      cell: ({ row }) => (
        <span className="text-sm truncate max-w-[300px] block">{row.original.subject}</span>
      ),
    },
    {
      accessorKey: "sentAt",
      header: "Sent At",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{formatDate(row.original.sentAt, "short")}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "SENT" ? "success" : "destructive"} className="text-xs">
          {row.original.status === "SENT" ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
          {row.original.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification History"
        description={`${data?.total ?? 0} total email/notification events logged`}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by email, booking ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background pl-9 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <DataTable columns={columns} data={filtered} isLoading={loading} pageSize={50} />

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.pages}
          </span>
          <button
            className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page === data.pages}
          >
            Next
          </button>
        </div>
      )}

      {data && data.notifications.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No notifications found.</p>
            <p className="text-xs text-muted-foreground mt-1">Email logs appear here once Resend sends are triggered.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
