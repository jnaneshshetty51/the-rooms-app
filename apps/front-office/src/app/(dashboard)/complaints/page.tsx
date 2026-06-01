"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  Bed,
  Send,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface Complaint {
  id: string;
  subject: string;
  description: string;
  status: string;
  isUrgent: boolean;
  imageUrl?: string;
  resolution?: string;
  createdAt: string;
  resolvedAt?: string;
  booking: {
    id: string;
    bookingNumber: string;
    guest: {
      name: string;
      phone: string;
    };
    room: {
      roomNumber: string;
      type: string;
    };
  };
}

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolution, setResolution] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchComplaints() {
      try {
        const params = new URLSearchParams();
        if (filter === "open") {
          params.set("status", "OPEN,IN_PROGRESS");
        } else if (filter === "resolved") {
          params.set("status", "RESOLVED,CLOSED");
        }

        const res = await fetch(`/api/complaints?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to fetch complaints");
        const data = await res.json();
        setComplaints(data.complaints ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchComplaints();
  }, [filter]);

  const handleResolve = async (complaintId: string, newStatus: string) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/complaints", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: complaintId,
          status: newStatus,
          resolution,
        }),
      });

      if (!res.ok) throw new Error("Failed to update complaint");

      // Update local state
      setComplaints((prev) =>
        prev.map((c) =>
          c.id === complaintId
            ? { ...c, status: newStatus, resolution, resolvedAt: new Date().toISOString() }
            : c
        )
      );
      setSelectedComplaint(null);
      setResolution("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update complaint");
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = complaints.filter((c) => c.status === "OPEN" || c.status === "IN_PROGRESS").length;
  const urgentCount = complaints.filter((c) => c.isUrgent && c.status === "OPEN").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Complaints Queue</h2>
          <p className="text-gray-500">Manage and resolve guest complaints</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setFilter("open")}
          className={cn(
            "rounded-xl border p-6 text-left transition-all",
            filter === "open"
              ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500"
              : "border-gray-200 bg-white hover:border-orange-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Open Complaints</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{openCount}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-orange-600" />
          </div>
        </button>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Urgent</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{urgentCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <button
          onClick={() => setFilter("resolved")}
          className={cn(
            "rounded-xl border p-6 text-left transition-all",
            filter === "resolved"
              ? "border-green-500 bg-green-50 ring-2 ring-green-500"
              : "border-gray-200 bg-white hover:border-green-300"
          )}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Resolved</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {complaints.filter((c) => c.status === "RESOLVED" || c.status === "CLOSED").length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && complaints.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filter === "open"
              ? "No open complaints"
              : filter === "resolved"
              ? "No resolved complaints"
              : "No complaints found"}
          </p>
        </div>
      )}

      {/* Complaints List */}
      {!loading && complaints.length > 0 && (
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div
              key={complaint.id}
              className={cn(
                "rounded-xl border bg-white hover:shadow-md transition-shadow",
                complaint.isUrgent && complaint.status === "OPEN"
                  ? "border-red-300 border-l-4 border-l-red-500"
                  : "border-gray-200"
              )}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {complaint.isUrgent && complaint.status === "OPEN" && (
                      <div className="rounded-full bg-red-100 p-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {complaint.subject}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            complaint.status === "OPEN"
                              ? "bg-red-100 text-red-700"
                              : complaint.status === "IN_PROGRESS"
                              ? "bg-orange-100 text-orange-700"
                              : complaint.status === "RESOLVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          )}
                        >
                          {complaint.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 text-gray-600">{complaint.description}</p>

                      <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
                        <Link
                          href={`/bookings/${complaint.booking.id}`}
                          className="flex items-center gap-1 hover:text-[#E17055]"
                        >
                          <User className="h-4 w-4" />
                          {complaint.booking.guest.name}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Bed className="h-4 w-4" />
                          Room {complaint.booking.room.roomNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(complaint.createdAt, "short")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {complaint.resolution && (
                  <div className="mt-4 p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800">Resolution</p>
                    <p className="text-sm text-green-700 mt-1">{complaint.resolution}</p>
                  </div>
                )}
              </div>

              {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
                <div className="border-t border-gray-100 px-6 py-3 flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedComplaint(complaint);
                      setResolution("");
                    }}
                    className="flex-1 rounded-lg bg-[#E17055] py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
                  >
                    Resolve Complaint
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">Resolve Complaint</h3>
              <p className="text-sm text-gray-500 mt-1">{selectedComplaint.subject}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
                  placeholder="Describe how the issue was resolved..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedComplaint(null);
                    setResolution("");
                  }}
                  className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleResolve(selectedComplaint.id, "RESOLVED")}
                  disabled={submitting || !resolution.trim()}
                  className="flex-1 rounded-lg bg-green-600 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Mark Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
