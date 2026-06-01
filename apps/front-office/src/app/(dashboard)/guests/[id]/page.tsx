"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  Edit,
  Plus,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface GuestDetail {
  id: string;
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  address?: string;
  dateOfBirth?: string;
  companyName?: string;
  stayCount: number;
  loyaltyTier: string;
  notes?: string;
  bookings: Array<{
    id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    status: string;
    paymentStatus: string;
    totalAmount: string;
    room: { roomNumber: string; type: string };
  }>;
  documents: Array<{
    id: string;
    documentType: string;
    frontUrl: string;
    backUrl?: string;
    verified: boolean;
    uploadedAt: string;
  }>;
}

export default function GuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [guest, setGuest] = useState<GuestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGuest() {
      try {
        // In production, this would be /api/guests/${id}
        // For now, we'll search by the guest ID
        const res = await fetch(`/api/guests/search?q=${id}`);
        if (res.ok) {
          const data = await res.json();
          const foundGuest = data.guests?.find((g: GuestDetail) => g.id === id);
          if (foundGuest) {
            setGuest(foundGuest);
          } else {
            setError("Guest not found");
          }
        } else {
          setError("Failed to load guest");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchGuest();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
      </div>
    );
  }

  if (error || !guest) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-gray-900 font-medium">{error ?? "Guest not found"}</p>
          <Link href="/guests" className="mt-4 text-[#E17055] hover:underline">
            Back to Guests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/guests" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[#E17055] flex items-center justify-center">
              <span className="text-white font-bold text-2xl">{guest.name.charAt(0)}</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">{guest.name}</h2>
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  guest.loyaltyTier === "GOLD"
                    ? "bg-yellow-100 text-yellow-700"
                    : guest.loyaltyTier === "SILVER"
                    ? "bg-gray-200 text-gray-700"
                    : "bg-orange-100 text-orange-700"
                )}>
                  {guest.loyaltyTier}
                </span>
              </div>
              <p className="text-gray-500">{guest.stayCount} stays</p>
            </div>
          </div>
        </div>
        <Link
          href={`/bookings/new?guest=${guest.id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contact Information</h3>
              <button className="text-sm text-[#E17055] hover:underline flex items-center gap-1">
                <Edit className="h-4 w-4" />
                Edit
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium text-gray-900">{guest.phone}</p>
                </div>
              </div>
              {guest.alternatePhone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Alternate Phone</p>
                    <p className="font-medium text-gray-900">{guest.alternatePhone}</p>
                  </div>
                </div>
              )}
              {guest.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{guest.email}</p>
                  </div>
                </div>
              )}
              {guest.companyName && (
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-medium text-gray-900">{guest.companyName}</p>
                </div>
              )}
              {guest.address && (
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium text-gray-900">{guest.address}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking History */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking History</h3>
            {guest.bookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No booking history</p>
              </div>
            ) : (
              <div className="space-y-3">
                {guest.bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/bookings/${booking.id}`}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          Room {booking.room.roomNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(booking.checkIn, "short")} - {formatDate(booking.checkOut, "short")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        booking.status === "CHECKED_IN"
                          ? "bg-blue-100 text-blue-700"
                          : booking.status === "CHECKED_OUT"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-green-100 text-green-700"
                      )}>
                        {booking.status.replace("_", " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Documents */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Documents</h3>
              <Link href={`/documents?guest=${guest.id}`} className="text-sm text-[#E17055] hover:underline">
                Manage
              </Link>
            </div>
            {guest.documents.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No documents uploaded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {guest.documents.map((doc) => (
                  <div key={doc.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{doc.documentType}</span>
                      {doc.verified ? (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          Verified
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm text-orange-600">
                          <Clock className="h-4 w-4" />
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded {formatDate(doc.uploadedAt, "short")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          {guest.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-600 whitespace-pre-wrap">{guest.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
