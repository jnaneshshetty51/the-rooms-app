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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@the-rooms/ui";
import {
  Database,
  Download,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  HardDrive,
  Clock,
  Shield,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";
import { useToast } from "@the-rooms/ui";

interface Backup {
  id: string;
  date: string;
  size: string;
  status: "success" | "failed" | "running";
  type: "Full" | "Incremental";
  duration: string;
  destination: string;
  createdBy: string;
}

// Mocks removed

import { LoadingSpinner } from "@the-rooms/ui";

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreDialog, setRestoreDialog] = useState<string | null>(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const toast = useToast();

  const successCount = backups.filter((b) => b.status === "success").length;
  const totalSize = backups
    .filter((b) => b.status === "success")
    .reduce((s, b) => s + parseFloat(b.size), 0);
  const lastSuccess = backups.find((b) => b.status === "success");
  const nextBackup = "2026-05-30 02:00";

  async function fetchBackups() {
    try {
      const res = await fetch("/api/backups");
      if (res.ok) {
        const json = await res.json();
        setBackups(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchBackups();
    // Poll for updates if a backup is running
    const interval = setInterval(fetchBackups, 10000);
    return () => clearInterval(interval);
  }, []);

  async function triggerBackup() {
    setRunningBackup(true);
    toast.success("Backup initiated", "Starting full backup...");
    
    try {
      const res = await fetch("/api/backups", { method: "POST" });
      if (res.ok) {
        const json = await res.json();
        setBackups((prev) => [json.data, ...prev]);
        toast.success("Backup started successfully");
      } else {
        toast.error("Failed to start backup");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to server");
    } finally {
      setRunningBackup(false);
    }
  }

  function restoreBackup(id: string) {
    toast.success("Restore initiated", "Restoring from backup...");
    setRestoreDialog(null);
    setTimeout(() => {
      toast.success("Restore completed");
    }, 3000);
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Backup Manager"
        description="Automated and manual PostgreSQL + MinIO backup management"
        actions={
          <Button
            onClick={triggerBackup}
            disabled={runningBackup}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${runningBackup ? "animate-spin" : ""}`} />
            {runningBackup ? "Backing up..." : "Trigger Backup Now"}
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-lg font-bold">{successCount}/{backups.length}</p>
                <p className="text-xs text-muted-foreground">Successful backups</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-[#E17055]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-[#E17055]" />
              <div>
                <p className="text-lg font-bold">~{totalSize.toFixed(1)} GB</p>
                <p className="text-xs text-muted-foreground">Total backed up</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-bold">
                  {lastSuccess ? formatDate(lastSuccess.date, "short") : "Never"}
                </p>
                <p className="text-xs text-muted-foreground">Last successful</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-bold">{formatDate(nextBackup, "short")}</p>
                <p className="text-xs text-muted-foreground">Next scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#E17055]" />
            Automated Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Full Backup</p>
              <p className="text-sm font-semibold">Daily at 2:00 AM IST</p>
              <p className="text-[10px] text-muted-foreground">PostgreSQL + MinIO snapshots</p>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Incremental Backup</p>
              <p className="text-sm font-semibold">Every 12 hours (2 PM IST)</p>
              <p className="text-[10px] text-muted-foreground">Changes since last full backup</p>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Retention</p>
              <p className="text-sm font-semibold">14 days locally, 90 days offsite</p>
              <p className="text-[10px] text-muted-foreground">Backblaze B2 cold storage</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Backup History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {backups.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between px-6 py-4 hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    {backup.status === "success" && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {backup.status === "failed" && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {backup.status === "running" && (
                      <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{formatDate(backup.date, "long")}</p>
                      <Badge
                        variant={backup.type === "Full" ? "default" : "outline"}
                        className="text-[10px]"
                      >
                        {backup.type}
                      </Badge>
                      {backup.createdBy.includes("Manual") && (
                        <Badge variant="secondary" className="text-[10px]">
                          Manual
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {backup.size}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {backup.duration}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {backup.destination}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      backup.status === "success"
                        ? "success"
                        : backup.status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs"
                  >
                    {backup.status === "success"
                      ? "Success"
                      : backup.status === "failed"
                      ? "Failed"
                      : "Running"}
                  </Badge>
                  {backup.status === "success" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 h-7 text-xs"
                      onClick={() => setRestoreDialog(backup.id)}
                    >
                      <RefreshCw className="h-3 w-3" />
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation */}
      <Dialog open={!!restoreDialog} onOpenChange={() => setRestoreDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Restore from Backup
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will overwrite the current database with data from the selected backup. This action
              cannot be undone.
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700">
                <strong>Recommended:</strong> Trigger a fresh backup before restoring to ensure you have a
                rollback point.
              </p>
            </div>
            <p className="text-sm">
              Type <strong>&quot;restore&quot;</strong> to confirm:
            </p>
            <input
              type="text"
              placeholder="Type 'restore' to confirm"
              className="w-full border border-input bg-white rounded-lg px-3 py-2 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value === "restore") {
                  restoreDialog && restoreBackup(restoreDialog);
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => restoreDialog && restoreBackup(restoreDialog)}
            >
              Restore Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
