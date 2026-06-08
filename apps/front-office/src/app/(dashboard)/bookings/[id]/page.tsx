"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, User, Calendar, CreditCard, FileText, CheckCircle, Bed, AlertCircle, Plus, Activity, Download } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface AuditLog {
  id: string;
  action: string;
  metadata: any;
  createdAt: string;
}

interface Booking { id: string; bookingNumber: string; status: string; paymentStatus: string; bookingSource: string; bookingType: string; checkIn: string; checkOut: string; createdAt: string; guestsCount: number; specialRequests?: string; totalAmount: string; baseAmount: string; discountAmount: string; checkInTime?: string; checkOutTime?: string; complimentaryReason?: string; guest: { id: string; name: string; phone: string; email?: string; companyName?: string }; room: { id: string; roomNumber: string; type: string; floor: number }; payments: Array<{ id: string; amount: string; method: string; status: string }>; documents: Array<{ id: string; documentType: string; verified: boolean }>; auditLogs?: AuditLog[] }

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"CHARGE" | "NOTE" | "REQUEST">("NOTE");

  useEffect(() => {
    fetchBooking();
  }, [id]);

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || data.details || "Booking not found");
      }
      const data = await res.json();
      setBooking(data);
    }
    catch (err) { setError(err instanceof Error ? err.message : "Unknown error"); }
    finally { setLoading(false); }
  }

  const handleCheckIn = async () => {
    if (!confirm("Check in this guest?")) return;
    try { const res = await fetch(`/api/bookings/${id}/check-in`, { method: "POST" }); if (res.ok) { fetchBooking(); alert("Checked in!"); } }
    catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}/invoice`);
      if (!res.ok) { alert("Invoice not found. Please complete check-out first."); return; }
      window.open(`/api/bookings/${id}/invoice/pdf`, "_blank");
    } catch (err) {
      alert("Error opening invoice.");
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (error || !booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error ?? "Booking not found"}</p><Link href="/bookings" className="mt-4 text-[#E17055] hover:underline">Back</Link></div></div>;

  const totalPaid = booking.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = Number(booking.totalAmount) - totalPaid;

  const activityLogs = booking.auditLogs?.filter(l => ["CHARGE_ADDED", "BOOKING_NOTE", "GUEST_REQUEST"].includes(l.action)) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/bookings" className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5 text-gray-600" /></Link>
          <div><div className="flex items-center gap-3"><h2 className="text-2xl font-bold text-gray-900">Booking #{booking.bookingNumber}</h2><span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">{booking.bookingSource}</span></div><p className="text-gray-500">Created {formatDate(booking.createdAt, "short")}</p></div>
        </div>
        <span className={cn("rounded-full px-4 py-2 text-sm font-medium", booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" : booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : booking.status === "CHECKED_OUT" ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700")}>{booking.status.replace("_", " ")}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><User className="h-5 w-5" />Guest Details</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><p className="text-sm text-gray-500">Name</p><p className="font-medium text-gray-900">{booking.guest.name}</p></div><div><p className="text-sm text-gray-500">Phone</p><p className="font-medium text-gray-900">{booking.guest.phone}</p></div>{booking.guest.email && <div><p className="text-sm text-gray-500">Email</p><p className="font-medium text-gray-900">{booking.guest.email}</p></div>}{booking.guest.companyName && <div><p className="text-sm text-gray-500">Company</p><p className="font-medium text-gray-900">{booking.guest.companyName}</p></div>}</div></div>

          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="h-5 w-5" />Stay Details</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><p className="text-sm text-gray-500">Check-in</p><p className="font-medium text-gray-900">{formatDate(booking.checkIn, "short")}</p></div><div><p className="text-sm text-gray-500">Check-out</p><p className="font-medium text-gray-900">{formatDate(booking.checkOut, "short")}</p></div><div><p className="text-sm text-gray-500">Room</p><p className="font-medium text-gray-900">{booking.room.roomNumber}</p></div><div><p className="text-sm text-gray-500">Guests</p><p className="font-medium text-gray-900">{booking.guestsCount}</p></div></div>{booking.specialRequests && <div className="mt-4 p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Special Requests</p><p className="text-gray-900">{booking.specialRequests}</p></div>}</div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><Activity className="h-5 w-5" />Activity Log</h3>
            </div>
            {activityLogs.length === 0 ? (
              <div className="text-center py-8"><Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No activity recorded</p></div>
            ) : (
              <div className="space-y-3">
                {activityLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-semibold text-gray-900">
                          {log.action === "CHARGE_ADDED" && "Charge Added"}
                          {log.action === "BOOKING_NOTE" && "Note Added"}
                          {log.action === "GUEST_REQUEST" && "Guest Request"}
                        </span>
                        {log.action === "CHARGE_ADDED" && (
                          <p className="text-sm text-gray-700 mt-1">{log.metadata.reason}: <span className="font-medium text-[#E17055]">{formatCurrency(log.metadata.amount)}</span></p>
                        )}
                        {(log.action === "BOOKING_NOTE" || log.action === "GUEST_REQUEST") && (
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{log.metadata.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDate(log.createdAt, "short")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6"><div className="flex items-center justify-between mb-4"><h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FileText className="h-5 w-5" />Documents</h3><Link href={`/documents?booking=${booking.id}`} className="text-sm text-[#E17055] hover:underline">Manage</Link></div>{booking.documents.length === 0 ? <div className="text-center py-8"><FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No documents uploaded</p></div> : <div className="space-y-3">{booking.documents.map((doc) => <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-gray-400" /><span className="font-medium text-gray-900">{doc.documentType}</span></div>{doc.verified ? <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle className="h-4 w-4" />Verified</span> : <span className="flex items-center gap-1 text-sm text-orange-600">Pending</span>}</div>)}</div>}</div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment Summary</h3>
            {booking.bookingSource === "COMPLIMENTARY" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <span className="text-purple-700 font-medium">Complimentary Stay</span>
                </div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Room Charges</span><span className="text-gray-900 line-through">{formatCurrency(Number(booking.totalAmount))}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">Reason</span><span className="text-purple-700 font-medium">{booking.complimentaryReason?.replace("_", " ")}</span></div>
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-3"><span>Total</span><span className="text-purple-700">FREE</span></div>
              </div>
            ) : (
              <div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-gray-600">Room Charges</span><span className="text-gray-900">{formatCurrency(Number(booking.baseAmount))}</span></div>{Number(booking.discountAmount) > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-{formatCurrency(Number(booking.discountAmount))}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-600">Extras / Charges</span><span className="text-gray-900">{formatCurrency(Number(booking.totalAmount) - Number(booking.baseAmount))}</span></div>
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-3"><span>Total</span><span className="text-[#E17055]">{formatCurrency(Number(booking.totalAmount))}</span></div><div className="flex justify-between text-sm"><span className="text-gray-600">Paid</span><span className="text-green-600">{formatCurrency(totalPaid)}</span></div><div className="flex justify-between font-semibold text-sm"><span>Balance Due</span><span className={balanceDue > 0 ? "text-orange-600" : "text-green-600"}>{formatCurrency(balanceDue)}</span></div></div>
            )}
            {booking.bookingSource !== "COMPLIMENTARY" && balanceDue > 0 && <Link href={`/payments?booking=${booking.id}`} className="mt-4 block w-full rounded-lg border border-[#E17055] py-2 text-center text-sm font-medium text-[#E17055] hover:bg-[#E17055]/5">Record Payment</Link>}</div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {booking.status === "CONFIRMED" && booking.paymentStatus === "PAID" && <button onClick={handleCheckIn} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F]"><CheckCircle className="h-4 w-4" />Check-In Guest</button>}
              {booking.status === "CHECKED_IN" && <Link href={`/bookings/${id}/check-out`} className="block w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700"><Bed className="h-4 w-4" />Check-Out Guest</Link>}
              {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
                <>
                  <button onClick={() => { setActionType("CHARGE"); setActionModalOpen(true); }} className="w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"><Plus className="h-4 w-4" /> Add Charge</button>
                  <button onClick={() => { setActionType("REQUEST"); setActionModalOpen(true); }} className="w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"><Plus className="h-4 w-4" /> Add Request</button>
                  <button onClick={() => { setActionType("NOTE"); setActionModalOpen(true); }} className="w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"><Plus className="h-4 w-4" /> Add Note</button>
                </>
              )}
              {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && <Link href={`/bookings/${id}/extend`} className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Modify Stay Dates</Link>}
              {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && <Link href={`/bookings/${id}/reassign`} className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">Reassign Room</Link>}
              <Link href={`/guests/${booking.guest.id}`} className="block w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50">View Guest Profile</Link>

              {booking.status === "CHECKED_OUT" && (
                <button onClick={handleDownloadInvoice} className="w-full rounded-lg border border-gray-300 py-3 text-center text-sm font-medium text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2">
                  <Download className="h-4 w-4" /> Download Invoice
                </button>
              )}

              {booking.status === "CONFIRMED" && (
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to cancel this booking?")) {
                      try {
                        const res = await fetch(`/api/bookings/${booking.id}/cancel`, { method: "POST" });
                        if (res.ok) fetchBooking();
                        else alert("Failed to cancel booking.");
                      } catch (error) {
                        alert("An error occurred.");
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-red-200 text-red-600 py-3 text-center text-sm font-medium hover:bg-red-50"
                >
                  Cancel Booking
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {actionModalOpen && (
        <BookingActionModal
          bookingId={booking.id}
          actionType={actionType}
          onClose={() => setActionModalOpen(false)}
          onSuccess={() => { setActionModalOpen(false); fetchBooking(); }}
        />
      )}
    </div>
  );
}

function BookingActionModal({ bookingId, actionType, onClose, onSuccess }: { bookingId: string, actionType: "CHARGE" | "NOTE" | "REQUEST", onClose: () => void, onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          amount: actionType === "CHARGE" ? Number(amount) : undefined,
          reason: actionType === "CHARGE" ? reason : undefined,
          notes: actionType !== "CHARGE" ? notes : undefined
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {actionType === "CHARGE" && "Add Charge"}
            {actionType === "NOTE" && "Add Internal Note"}
            {actionType === "REQUEST" && "Add Guest Request"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          {actionType === "CHARGE" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" min="1" step="1" required value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Description *</label>
                <input type="text" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Room Service, Mini-bar" className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent" />
              </div>
            </>
          )}

          {(actionType === "NOTE" || actionType === "REQUEST") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Details *</label>
              <textarea required rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent" />
            </div>
          )}

          <div className="pt-4">
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
