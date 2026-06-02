"use client";

import { useEffect, useState, useTransition } from "react";
import {
  StatCard,
  PageHeader,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  LoadingSpinner,
} from "@the-rooms/ui";
import {
  DollarSign,
  TrendingUp,
  Users,
  CalendarDays,
  Bed,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate } from "@the-rooms/ui";

interface DashboardKPIs {
  mrr: number;
  arr: number;
  occupancyRate: number;
  activeBookings: number;
  grossRevenue: number;
  netRevenue: number;
  adr: number;
  revpar: number;
  totalRooms: number;
  availableRooms: number;
  occupiedCount: number;
  checkedInToday: number;
  pendingCheckIns: number;
}

interface SystemHealthService {
  name: string;
  status: "ok" | "slow" | "down";
  responseTime?: number;
  detail?: string;
  uptime?: string;
  lastChecked: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: { name: string; email: string };
}

// Removed fallback data for live mode

function HealthIndicator({ status }: { status: "ok" | "slow" | "down" }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "slow") return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function SystemHealthCard({
  services,
  isLoading,
}: {
  services: SystemHealthService[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#E17055]" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#E17055]" />
          System Health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HealthIndicator status={svc.status} />
              <span className="text-sm text-muted-foreground">{svc.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {svc.responseTime !== undefined && (
                <span className="text-xs text-muted-foreground">{svc.responseTime}ms</span>
              )}
              <Badge
                variant={
                  svc.status === "ok"
                    ? "success"
                    : svc.status === "slow"
                    ? "warning"
                    : "destructive"
                }
                className="text-[10px]"
              >
                {svc.status === "ok" ? "Healthy" : svc.status === "slow" ? "Slow" : "Down"}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentAuditCard({ entries }: { entries: AuditEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#E17055]" />
            Recent Activity
          </CardTitle>
          <Link
            href="/audit-logs"
            className="text-xs text-[#E17055] hover:text-[#D35B3F] font-medium flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">No recent activity.</p>
        ) : (
          entries.map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div className="mt-0.5 h-2 w-2 rounded-full bg-[#E17055] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-foreground truncate">
                  {entry.action.replace(/_/g, " ")}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  {entry.user && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      {entry.user.name}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDate(entry.createdAt, "short")}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardContent() {
  const [isPending, startTransition] = useTransition();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [services, setServices] = useState<SystemHealthService[]>([]);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const isLoading = isPending;

  useEffect(() => {
    startTransition(async () => {
      try {
        const [dashRes, healthRes] = await Promise.all([
          fetch("/api/analytics/dashboard", { cache: "no-store" }),
          fetch("/api/system-health", { cache: "no-store" }),
        ]);

        if (!dashRes.ok) {
          if (dashRes.status === 401) {
            setDashboardError("Session expired. Please log in again.");
          }
          throw new Error("Dashboard API error");
        }

        const dashJson = await dashRes.json();
        setKpis(dashJson.data);
        setRecentAudit(dashJson.recentAudit ?? []);

        if (healthRes.ok) {
          const healthJson = await healthRes.json();
          setServices(healthJson.data?.services ?? []);
        }
      } catch {
        // Keep fallback data on network/API errors
        // Error message handled above for auth errors
      }
    });
  }, []);

  if (isLoading || !kpis) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Ownership overview — all metrics at a glance"
      />

      {dashboardError && (
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <p className="text-sm text-destructive">{dashboardError}</p>
          </CardContent>
        </Card>
      )}

      {/* Revenue KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Monthly Revenue (MRR)"
          value={formatCurrency(kpis.mrr)}
          format="currency"
          icon={DollarSign}
        />
        <StatCard
          label="Annual Run Rate (ARR)"
          value={formatCurrency(kpis.arr)}
          format="currency"
          icon={TrendingUp}
        />
        <StatCard
          label="Occupancy Rate"
          value={kpis.occupancyRate}
          format="percent"
          icon={Bed}
        />
        <StatCard
          label="Active Bookings"
          value={kpis.activeBookings}
          icon={CalendarDays}
        />
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Gross Revenue (MTD)"
          value={formatCurrency(kpis.grossRevenue)}
          format="currency"
          icon={DollarSign}
        />
        <StatCard
          label="Net Revenue (MTD)"
          value={formatCurrency(kpis.netRevenue)}
          format="currency"
          icon={DollarSign}
        />
        <StatCard
          label="Avg Daily Rate (ADR)"
          value={formatCurrency(kpis.adr)}
          format="currency"
          icon={TrendingUp}
        />
        <StatCard
          label="RevPAR"
          value={formatCurrency(kpis.revpar)}
          format="currency"
          icon={Bed}
        />
      </div>

      {/* Operations Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Rooms" value={kpis.totalRooms} icon={Bed} />
        <StatCard
          label="Available Rooms"
          value={`${kpis.availableRooms} / ${kpis.totalRooms}`}
          icon={CheckCircle2}
        />
        <StatCard label="Checked In Today" value={kpis.checkedInToday} icon={Users} />
        <StatCard
          label="Pending Check-ins"
          value={kpis.pendingCheckIns}
          icon={Clock}
        />
      </div>

      {/* Bottom: System Health + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthCard services={services} isLoading={isLoading} />
        <RecentAuditCard entries={recentAudit} />
      </div>
    </div>
  );
}
