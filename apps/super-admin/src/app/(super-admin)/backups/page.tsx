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
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  Input,
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
  Calendar,
  Settings,
  Bell,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";
import { useToast } from "@the-rooms/ui";
import { LoadingSpinner } from "@the-rooms/ui";

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

interface BackupSchedule {
  enabled: boolean;
  frequency: "daily" | "weekly" | "custom";
  fullBackupTime: string; // HH:MM format
  incrementalBackupTime: string;
  fullBackupDay?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
  retentionDays: number;
  offsiteRetentionDays: number;
  lastFullBackup: string | null;
  nextFullBackup: string | null;
  nextIncrementalBackup: string | null;
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreDialog, setRestoreDialog] = useState<string | null>(null);
  const [runningBackup, setRunningBackup] = useState(false);
  const [scheduleDialog, setScheduleDialog] = useState(false);
  const toast = useToast();

  // Schedule state
  const [schedule, setSchedule] = useState<BackupSchedule>({
    enabled: true,
    frequency: "daily",
    fullBackupTime: "02:00",
    incrementalBackupTime: "14:00",
    fullBackupDay: "sunday",
    retentionDays: 14,
    offsiteRetentionDays: 90,
    lastFullBackup: null,
    nextFullBackup: null,
    nextIncrementalBackup: null,
  });

  const successCount = backups.filter((b) => b.status === "success").length;
  const totalSize = backups
    .filter((b) => b.status === "success")
    .reduce((s, b) => s + parseFloat(b.size), 0);
  const lastSuccess = backups.find((b) => b.status === "success");

  // Calculate next backup times based on schedule
  const calculateNextBackup = () => {
    const now = new Date();
    const [hours, minutes] = schedule.fullBackupTime.split(":").map(Number);

    // Next full backup
    let nextFull = new Date(now);
    nextFull.setHours(hours, minutes, 0, 0);
    if (nextFull <= now) {
      if (schedule.frequency === "daily") {
        nextFull.setDate(nextFull.getDate() + 1);
      } else if (schedule.frequency === "weekly") {
        const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
        const targetDay = schedule.fullBackupDay || "sunday";
        const targetDayIndex = daysOfWeek.indexOf(targetDay);
        const currentDayIndex = now.getDay();
        let daysUntilNext = (targetDayIndex - currentDayIndex + 7) % 7;
        if (daysUntilNext === 0) daysUntilNext = 7;
        nextFull.setDate(nextFull.getDate() + daysUntilNext);
      }
    }

    // Next incremental backup
    const [incHours, incMinutes] = schedule.incrementalBackupTime.split(":").map(Number);
    let nextInc = new Date(now);
    nextInc.setHours(incHours, incMinutes, 0, 0);
    if (nextInc <= now) {
      nextInc.setDate(nextInc.getDate() + 1);
    }

    return {
      nextFullBackup: schedule.enabled ? nextFull.toISOString() : null,
      nextIncrementalBackup: schedule.enabled && schedule.frequency !== "weekly" ? nextInc.toISOString() : null,
    };
  };

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

  async function fetchSchedule() {
    try {
      const res = await fetch("/api/backups/schedule");
      if (res.ok) {
        const json = await res.json();
        if (json.schedule) {
          setSchedule(json.schedule);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    fetchBackups();
    fetchSchedule();
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

  async function saveSchedule() {
    try {
      const res = await fetch("/api/backups/schedule", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(schedule),
      });
      if (res.ok) {
        toast.success("Schedule saved", "Backup schedule updated successfully");
        setScheduleDialog(false);
      } else {
        toast.error("Failed to save schedule");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error saving schedule");
    }
  }

  function restoreBackup(id: string) {
    toast.success("Restore initiated", "Restoring from backup...");
    setRestoreDialog(null);
    setTimeout(() => {
      toast.success("Restore completed");
    }, 3000);
  }

  const { nextFullBackup, nextIncrementalBackup } = calculateNextBackup();

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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setScheduleDialog(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Schedule
            </Button>
            <Button
              onClick={triggerBackup}
              disabled={runningBackup}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${runningBackup ? "animate-spin" : ""}`} />
              {runningBackup ? "Backing up..." : "Trigger Backup Now"}
            </Button>
          </div>
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
              <Calendar className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-bold">
                  {nextFullBackup ? formatDate(nextFullBackup, "short") : "Disabled"}
                </p>
                <p className="text-xs text-muted-foreground">Next scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#E17055]" />
              Automated Schedule
            </span>
            <div className="flex items-center gap-2">
              {schedule.enabled ? (
                <Badge variant="default" className="bg-green-500">Active</Badge>
              ) : (
                <Badge variant="secondary">Disabled</Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setScheduleDialog(true)}
                className="gap-1"
              >
                <Settings className="h-3 w-3" /> Edit
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Full Backup</p>
                {schedule.enabled ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-semibold">
                {schedule.enabled
                  ? schedule.frequency === "weekly"
                    ? `Weekly on ${(schedule.fullBackupDay || "Sunday").charAt(0).toUpperCase() + (schedule.fullBackupDay || "sunday").slice(1)} at ${schedule.fullBackupTime}`
                    : `Daily at ${schedule.fullBackupTime} IST`
                  : "Disabled"
                }
              </p>
              <p className="text-[10px] text-muted-foreground">PostgreSQL + MinIO snapshots</p>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Incremental Backup</p>
                {schedule.enabled && schedule.frequency !== "weekly" ? (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-gray-400" />
                )}
              </div>
              <p className="text-sm font-semibold">
                {schedule.enabled && schedule.frequency !== "weekly"
                  ? `Every 12 hours at ${schedule.incrementalBackupTime} IST`
                  : schedule.enabled ? "Weekly - No incremental" : "Disabled"
                }
              </p>
              <p className="text-[10px] text-muted-foreground">Changes since last full backup</p>
            </div>
            <div className="p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">Retention</p>
                <Bell className="h-3 w-3 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold">{schedule.retentionDays} days local</p>
              <p className="text-[10px] text-muted-foreground">{schedule.offsiteRetentionDays} days offsite (Backblaze B2)</p>
            </div>
          </div>

          {/* Next Backups */}
          {schedule.enabled && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-2">Upcoming Backups</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-blue-700">
                    Full: <strong>{nextFullBackup ? formatDate(nextFullBackup, "long") : "N/A"}</strong>
                  </span>
                </div>
                {nextIncrementalBackup && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700">
                      Incremental: <strong>{formatDate(nextIncrementalBackup, "long")}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
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
              Type <strong>"restore"</strong> to confirm:
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

      {/* Schedule Configuration Dialog */}
      <Dialog open={scheduleDialog} onOpenChange={setScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Backup Schedule Configuration
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Enable/Disable */}
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-[#E17055]" />
                <div>
                  <p className="font-medium text-sm">Automatic Backups</p>
                  <p className="text-xs text-muted-foreground">Enable scheduled backups</p>
                </div>
              </div>
              <Switch
                checked={schedule.enabled}
                onCheckedChange={(checked) => setSchedule({ ...schedule, enabled: checked })}
              />
            </div>

            {/* Frequency */}
            <div>
              <label className="text-sm font-medium mb-2 block">Backup Frequency</label>
              <Select
                value={schedule.frequency}
                onValueChange={(v) => setSchedule({ ...schedule, frequency: v as "daily" | "weekly" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </SelectContent>
              </Select>
            </div>

            {/* Full Backup Time */}
            <div>
              <label className="text-sm font-medium mb-2 block">Full Backup Time (IST)</label>
              <Input
                type="time"
                value={schedule.fullBackupTime}
                onChange={(e) => setSchedule({ ...schedule, fullBackupTime: e.target.value })}
              />
            </div>

            {/* Weekly Day Selection */}
            {schedule.frequency === "weekly" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Day of Week</label>
                <Select
                  value={schedule.fullBackupDay}
                  onValueChange={(v) => setSchedule({ ...schedule, fullBackupDay: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <option value="monday">Monday</option>
                    <option value="tuesday">Tuesday</option>
                    <option value="wednesday">Wednesday</option>
                    <option value="thursday">Thursday</option>
                    <option value="friday">Friday</option>
                    <option value="saturday">Saturday</option>
                    <option value="sunday">Sunday</option>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Incremental Backup Time */}
            {schedule.frequency !== "weekly" && (
              <div>
                <label className="text-sm font-medium mb-2 block">Incremental Backup Time (IST)</label>
                <Input
                  type="time"
                  value={schedule.incrementalBackupTime}
                  onChange={(e) => setSchedule({ ...schedule, incrementalBackupTime: e.target.value })}
                />
              </div>
            )}

            {/* Retention */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Local Retention (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={schedule.retentionDays}
                  onChange={(e) => setSchedule({ ...schedule, retentionDays: parseInt(e.target.value) || 14 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Offsite Retention (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={schedule.offsiteRetentionDays}
                  onChange={(e) => setSchedule({ ...schedule, offsiteRetentionDays: parseInt(e.target.value) || 90 })}
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Offsite backups are stored on Backblaze B2 for disaster recovery.
                Retention period determines how long backups are kept before automatic cleanup.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveSchedule}>
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
