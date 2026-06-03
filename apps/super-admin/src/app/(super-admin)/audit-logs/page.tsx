"use client";

import { useState, useEffect } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogTitle,
  LoadingSpinner,
} from "@the-rooms/ui";
import {
  Shield,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

type ActionCategory =
  | "AUTH"
  | "BOOKING"
  | "PAYMENT"
  | "ROOM"
  | "GUEST"
  | "USER"
  | "SYSTEM";

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string;
  createdAt: string;
  category: ActionCategory;
}

// Removed MOCK_AUDIT for live data

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  AUTH: "Auth",
  BOOKING: "Booking",
  PAYMENT: "Payment",
  ROOM: "Room",
  GUEST: "Guest",
  USER: "User",
  SYSTEM: "System",
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  AUTH: "bg-gray-100 text-gray-700",
  BOOKING: "bg-blue-100 text-blue-700",
  PAYMENT: "bg-green-100 text-green-700",
  ROOM: "bg-amber-100 text-amber-700",
  GUEST: "bg-purple-100 text-purple-700",
  USER: "bg-red-100 text-red-700",
  SYSTEM: "bg-slate-100 text-slate-700",
};

function AuditRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr
        className="border-b border-border hover:bg-accent/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
          {formatDate(entry.createdAt, "short")}
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="text-xs font-medium text-foreground">{entry.userName}</p>
            <p className="text-[10px] text-muted-foreground">{entry.userEmail}</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {entry.action.replace(/_/g, " ")}
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                CATEGORY_COLORS[entry.category]
              }`}
            >
              {CATEGORY_LABELS[entry.category]}
            </span>
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {entry.entity}
          {entry.entityId && (
            <span className="ml-1 text-[10px] text-[#E17055]">#{entry.entityId}</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">{entry.ipAddress}</td>
        <td className="px-4 py-3">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border bg-accent/20">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                Metadata
              </p>
              <pre className="text-xs bg-white rounded p-2 overflow-x-auto text-foreground">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category !== "all") params.set("category", category);
        if (userFilter !== "all") params.set("userId", userFilter);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await fetch(`/api/audit-logs?${params.toString()}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) setLogs(json.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    // Debounce the fetch slightly for search typing
    const timer = setTimeout(fetchLogs, 300);
    return () => clearTimeout(timer);
  }, [search, category, userFilter, dateFrom, dateTo]);

  const filtered = logs;

  const uniqueUsers = Array.from(new Map(
    logs.map((e) => [e.userId, { id: e.userId, name: e.userName }])
  ).values());

  function handleExport() {
    const csv = [
      ["Timestamp", "User", "Email", "Action", "Entity", "Entity ID", "IP Address"],
      ...filtered.map((e) => [
        e.createdAt,
        e.userName,
        e.userEmail,
        e.action,
        e.entity,
        e.entityId ?? "",
        e.ipAddress,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Complete activity trail across all portals and users"
        actions={
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search actions, entities, users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="border border-input bg-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border border-input bg-white rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Users</option>
              {uniqueUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-36"
              placeholder="From"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-36"
              placeholder="To"
            />
            {(search || category !== "all" || userFilter !== "all" || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCategory("all");
                  setUserFilter("all");
                  setDateFrom("");
                  setDateTo("");
                }}
                className="text-xs"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <Card>
          <CardContent className="flex h-48 items-center justify-center">
            <LoadingSpinner />
          </CardContent>
        </Card>
      ) : (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {filtered.length} entries
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Showing last 90 days
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-accent/30">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    User
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    Entity
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                    IP Address
                  </th>
                  <th className="px-4 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      No audit log entries match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  );
}
