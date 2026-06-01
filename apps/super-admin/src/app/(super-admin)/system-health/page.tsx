"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  StatCard,
} from "@the-rooms/ui";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  HardDrive,
  Mail,
  CreditCard,
  Globe,
  Server,
  Clock,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface ServiceStatus {
  name: string;
  icon: React.ElementType;
  status: "ok" | "slow" | "down";
  responseTime?: number;
  detail?: string;
  lastChecked: string;
  uptime?: string;
}

const SERVICES: ServiceStatus[] = [
  {
    name: "PostgreSQL",
    icon: Database,
    status: "ok",
    responseTime: 12,
    detail: "16 connections active, 42MB buffer usage",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
    uptime: "99.98%",
  },
  {
    name: "Redis",
    icon: Server,
    status: "ok",
    responseTime: 2,
    detail: "Memory: 42MB / 256MB, Keys: 1,247",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
    uptime: "99.99%",
  },
  {
    name: "MinIO (Storage)",
    icon: HardDrive,
    status: "ok",
    responseTime: 28,
    detail: "Disk: 23% used (92GB / 400GB), 4 buckets",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
    uptime: "99.95%",
  },
  {
    name: "Resend (Email)",
    icon: Mail,
    status: "ok",
    responseTime: 180,
    detail: "API key valid, sending enabled, 0 queued",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
  },
  {
    name: "IDFC Bank (Payments)",
    icon: CreditCard,
    status: "ok",
    responseTime: 340,
    detail: "Production mode, last transaction 5min ago",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
  },
  {
    name: "Nginx (Reverse Proxy)",
    icon: Globe,
    status: "ok",
    responseTime: 1,
    detail: "12 active connections, SSL certificate valid (90 days)",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
    uptime: "99.99%",
  },
  {
    name: "Docker",
    icon: Server,
    status: "ok",
    responseTime: 8,
    detail: "6 containers running: postgres, redis, minio, nginx, app, cron",
    lastChecked: new Date(Date.now() - 30000).toISOString(),
  },
];

interface BackupEntry {
  id: string;
  date: string;
  size: string;
  status: "success" | "failed";
  type: "Full" | "Incremental";
  duration: string;
}

const BACKUPS: BackupEntry[] = [
  { id: "1", date: "2026-05-29 02:00", size: "2.4 GB", status: "success", type: "Full", duration: "18m" },
  { id: "2", date: "2026-05-28 02:00", size: "2.4 GB", status: "success", type: "Full", duration: "17m" },
  { id: "3", date: "2026-05-27 02:00", size: "2.3 GB", status: "success", type: "Full", duration: "16m" },
  { id: "4", date: "2026-05-26 02:00", size: "2.4 GB", status: "failed", type: "Full", duration: "-" },
  { id: "5", date: "2026-05-25 02:00", size: "2.4 GB", status: "success", type: "Full", duration: "18m" },
  { id: "6", date: "2026-05-24 02:00", size: "2.4 GB", status: "success", type: "Full", duration: "17m" },
];

function ServiceCard({ svc }: { svc: ServiceStatus }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = svc.icon;

  const statusIcon =
    svc.status === "ok" ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : svc.status === "slow" ? (
      <AlertCircle className="h-5 w-5 text-yellow-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );

  const statusColor =
    svc.status === "ok"
      ? "border-l-green-500"
      : svc.status === "slow"
      ? "border-l-yellow-500"
      : "border-l-red-500";

  return (
    <Card className={`border-l-4 ${statusColor}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-accent p-2">
              <Icon className="h-4 w-4 text-[#E17055]" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{svc.name}</CardTitle>
              <div className="flex items-center gap-2 mt-0.5">
                {statusIcon}
                <span
                  className={`text-xs font-medium ${
                    svc.status === "ok"
                      ? "text-green-600"
                      : svc.status === "slow"
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {svc.status === "ok"
                    ? "Healthy"
                    : svc.status === "slow"
                    ? "Degraded"
                    : "Down"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {svc.responseTime && (
              <div className="text-right">
                <p className="text-xs font-semibold">{svc.responseTime}ms</p>
                <p className="text-[10px] text-muted-foreground">response</p>
              </div>
            )}
            {svc.uptime && (
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-green-600">{svc.uptime}</p>
                <p className="text-[10px] text-muted-foreground">uptime</p>
              </div>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </CardHeader>
      {expanded && svc.detail && (
        <CardContent className="pt-0">
          <div className="rounded-lg bg-accent/50 p-3 space-y-1">
            {svc.detail.split(", ").map((line, i) => (
              <p key={i} className="text-xs text-muted-foreground">{line}</p>
            ))}
            <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/50">
              Last checked: {formatDate(svc.lastChecked, "short")}
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function SystemHealthPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 2000);
  }

  const healthyCount = SERVICES.filter((s) => s.status === "ok").length;
  const slowCount = SERVICES.filter((s) => s.status === "slow").length;
  const downCount = SERVICES.filter((s) => s.status === "down").length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="System Health"
        description="Service status, uptime, and infrastructure monitoring"
        actions={
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Checking..." : "Refresh"}
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Services Healthy"
          value={healthyCount}
          change={0}
          icon={CheckCircle2}
        />
        <StatCard
          label="Services Degraded"
          value={slowCount}
          change={slowCount > 0 ? slowCount : 0}
          icon={AlertCircle}
        />
        <StatCard
          label="Services Down"
          value={downCount}
          change={downCount > 0 ? downCount : 0}
          icon={XCircle}
        />
        <StatCard
          label="Last Checked"
          value={lastRefresh.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          icon={Clock}
        />
      </div>

      {/* Service Cards */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Services</h3>
        <div className="grid grid-cols-1 gap-3">
          {SERVICES.map((svc) => (
            <ServiceCard key={svc.name} svc={svc} />
          ))}
        </div>
      </div>

      {/* Backup Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4 text-[#E17055]" />
              Backup Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-xs">
                {BACKUPS.filter((b) => b.status === "success").length}/{BACKUPS.length} successful
              </Badge>
              <Button size="sm" variant="outline" className="gap-1 text-xs h-7">
                <RefreshCw className="h-3 w-3" />
                Trigger Backup
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {BACKUPS.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  {backup.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <p className="text-xs font-medium">
                      {formatDate(backup.date, "long")}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {backup.type} backup · {backup.size} · {backup.duration}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={backup.status === "success" ? "success" : "destructive"}
                  className="text-[10px]"
                >
                  {backup.status === "success" ? "Success" : "Failed"}
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Next scheduled backup:{" "}
            <strong className="text-foreground">Tomorrow 2:00 AM IST</strong> · Backup destination: S3-compatible (Backblaze B2)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
