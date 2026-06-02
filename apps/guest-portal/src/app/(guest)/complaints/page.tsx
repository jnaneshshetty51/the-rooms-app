"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  X,
  Upload,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

type Complaint = {
  id: string;
  subject: string;
  description: string;
  status: string;
  isUrgent: boolean;
  resolution?: string;
  resolvedAt?: string;
  createdAt: string;
  booking: {
    bookingNumber: string;
    room: { roomNumber: string };
  };
};

type Booking = {
  id: string;
  bookingNumber: string;
  status: string;
  room: { roomNumber: string; type: string };
};

const SUBJECT_OPTIONS = [
  { value: "room_cleanliness", label: "Room Cleanliness" },
  { value: "ac_issue", label: "AC / Temperature Issue" },
  { value: "plumbing_issue", label: "Plumbing Issue" },
  { value: "wifi_issue", label: "WiFi Issue" },
  { value: "noise_complaint", label: "Noise Complaint" },
  { value: "staff_behavior", label: "Staff Behavior" },
  { value: "food_quality", label: "Food Quality" },
  { value: "other", label: "Other" },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-[#FF7675]/10 text-[#D63031] border-[#FF7675]/20",
  IN_PROGRESS: "bg-[#FDCB6E]/10 text-[#D63031] border-[#FDCB6E]/20",
  RESOLVED: "bg-[#00B894]/10 text-[#00A381] border-[#00B894]/20",
  CLOSED: "bg-[#636E72]/10 text-[#636E72] border-[#636E72]/20",
};

function ComplaintsPageContent() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    bookingId: preselectedBookingId ?? "",
    subject: "",
    description: "",
    isUrgent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [complaintsRes, bookingsRes] = await Promise.all([
          fetch("/api/complaints"),
          fetch("/api/bookings"),
        ]);
        if (complaintsRes.ok) {
          const data = await complaintsRes.json();
          setComplaints(data.complaints ?? []);
        }
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings ?? []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.bookingId || !formData.subject || !formData.description) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          imageUrl: photoUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit complaint");
      }

      const data = await res.json();
      setComplaints((prev) => [data.complaint, ...prev]);
      setSuccess(
        "Complaint registered! Our team will address this promptly."
      );
      setFormData({ bookingId: "", subject: "", description: "", isUrgent: false });
      setPhotoUrl(null);
      setShowForm(false);
    } catch (err: any) {
      setError(err.message ?? "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2D3436]">Complaints</h1>
          <p className="text-sm text-[#636E72] mt-1">
            Report issues with your stay
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-[#E17055] hover:bg-[#D35B3F]"
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Raise Issue"}
        </Button>
      </div>

      {/* Raise issue form */}
      {showForm && (
        <Card className="border-[#FF7675]/30">
          <div className="h-1 bg-gradient-to-r from-[#FF7675] to-[#E17055]" />
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[#E17055]" />
              Report an Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Select Booking
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                  value={formData.bookingId}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, bookingId: e.target.value }))
                  }
                  required
                >
                  <option value="">Choose a booking</option>
                  {bookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bookingNumber} — Room {b.room.roomNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Issue Type
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, subject: e.target.value }))
                  }
                  required
                >
                  <option value="">Select issue type</option>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, description: e.target.value }))
                  }
                  placeholder="Please describe the issue in detail (min. 20 characters)..."
                  rows={4}
                  minLength={20}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] resize-none"
                  required
                />
              </div>

              {/* Photo upload */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Photo <span className="text-xs text-[#B2BEC3]">(optional, helps us resolve faster)</span>
                </label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-[#E5E5E5] rounded-lg p-4 flex flex-col items-center gap-2 hover:border-[#E17055] transition-colors cursor-pointer"
                >
                  {photoUrl ? (
                    <div className="flex items-center gap-3 w-full">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoUrl}
                        alt="Issue"
                        className="w-16 h-12 object-cover rounded border"
                      />
                      <div className="text-left">
                        <p className="text-sm font-medium text-[#2D3436]">Photo attached</p>
                        <p className="text-xs text-[#636E72]">Click to change</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoUrl(null);
                        }}
                      >
                        <X className="w-4 h-4 text-[#636E72]" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-[#B2BEC3]" />
                      <p className="text-sm text-[#636E72]">
                        Add a photo of the issue
                      </p>
                    </>
                  )}
                </button>
              </div>

              {/* Urgent toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isUrgent}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, isUrgent: e.target.checked }))
                  }
                  className="w-4 h-4 accent-[#E17055]"
                />
                <span className="text-sm font-medium text-[#2D3436]">
                  Mark as urgent
                </span>
              </label>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><AlertTriangle className="w-4 h-4 mr-2" /> Submit Complaint</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Complaints list */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3436] mb-3">
          Your Complaints ({complaints.length})
        </h2>
        {complaints.length === 0 ? (
          <Card className="border-dashed border-2 border-[#E5E5E5]">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
              <p className="text-[#636E72] font-medium">No complaints registered</p>
              <p className="text-sm text-[#B2BEC3] mt-1">
                All clear! No issues to report.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {complaints.map((complaint) => (
              <Card key={complaint.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={STATUS_COLORS[complaint.status] ?? ""}>
                          {complaint.status.replace("_", " ")}
                        </Badge>
                        {complaint.isUrgent && (
                          <Badge variant="destructive" className="text-[10px]">
                            URGENT
                          </Badge>
                        )}
                      </div>
                      <p className="font-medium text-[#2D3436]">
                        {SUBJECT_OPTIONS.find((s) => s.value === complaint.subject)?.label ??
                          complaint.subject}
                      </p>
                      <p className="text-sm text-[#636E72] mt-1 line-clamp-2">
                        {complaint.description}
                      </p>
                    </div>
                    <div className="text-right shrink-0 text-xs text-[#B2BEC3]">
                      <p>{formatDate(complaint.createdAt)}</p>
                      <p>{complaint.booking.bookingNumber}</p>
                    </div>
                  </div>
                  {complaint.resolution && (
                    <div className="bg-[#00B894]/5 rounded-lg p-3 border border-[#00B894]/20">
                      <p className="text-xs font-medium text-[#00A381] mb-1">Resolution</p>
                      <p className="text-sm text-[#636E72]">{complaint.resolution}</p>
                      {complaint.resolvedAt && (
                        <p className="text-xs text-[#B2BEC3] mt-1">
                          Resolved on {formatDate(complaint.resolvedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComplaintsPage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
      <ComplaintsPageContent />
    </Suspense>
  );
}
