"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, User, Calendar, CreditCard, FileText, CheckCircle, Bed, AlertCircle, Plus, Activity, Download, AlertTriangle, Clock, ArrowRight, Trash2, ShoppingBag, Utensils, Shirt, Flower2, Car, Coffee, MoreHorizontal } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface AuditLog {
  id: string;
  action: string;
  metadata: any;
  createdAt: string;
}

interface StayModificationRequest {
  id: string;
  type: string;
  status: string;
  originalCheckIn: string;
  originalCheckOut: string;
  requestedCheckIn?: string;
  requestedCheckOut?: string;
  reason?: string;
  notes?: string;
  extraChargeAmount: number;
  chargeDescription?: string;
  createdAt: string;
}

interface StayModificationPolicy {
  earlyCheckinEnabled: boolean;
  earlyCheckinCutoffHour: number;
  earlyCheckinChargeType: string;
  lateCheckoutEnabled: boolean;
  lateCheckoutCutoffHour: number;
  lateCheckoutChargeType: string;
  lateCheckoutMaxHour: number;
}

interface Booking { id: string; bookingNumber: string; status: string; paymentStatus: string; bookingSource: string; bookingType: string; checkIn: string; checkOut: string; createdAt: string; guestsCount: number; specialRequests?: string; totalAmount: string; baseAmount: string; discountAmount: string; checkInTime?: string; checkOutTime?: string; complimentaryReason?: string; noShowAt?: string; noShowCharge?: string; guest: { id: string; name: string; phone: string; email?: string; companyName?: string }; room: { id: string; roomNumber: string; type: string; floor: number }; payments: Array<{ id: string; amount: string; method: string; status: string }>; documents: Array<{ id: string; documentType: string; verified: boolean }>; auditLogs?: AuditLog[] }

interface AddonType {
  type: string;
  name: string;
  description: string;
  defaultPrice: number;
  unit: string;
  taxable: boolean;
}

interface BookingAddon {
  id: string;
  type: string;
  description: string;
  amount: string;
  quantity: number;
  serviceDate: string;
  cgst: string;
  sgst: string;
  totalAmount: string;
  addedBy?: { id: string; name: string; email: string };
  createdAt: string;
}

interface AddonTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  total: number;
  count: number;
}

// ─── Add-on Helper Functions ──────────────────────────────────────────────────

function getAddonIcon(type: string) {
  switch (type) {
    case "FB": return <Utensils className="h-4 w-4" />;
    case "LAUNDRY": return <Shirt className="h-4 w-4" />;
    case "SPA": return <Flower2 className="h-4 w-4" />;
    case "MINIBAR": return <Coffee className="h-4 w-4" />;
    case "RESTAURANT": return <Utensils className="h-4 w-4" />;
    case "TRANSPORT": return <Car className="h-4 w-4" />;
    case "ROOM_SERVICE": return <Coffee className="h-4 w-4" />;
    default: return <MoreHorizontal className="h-4 w-4" />;
  }
}

function getAddonTypeColor(type: string) {
  switch (type) {
    case "FB": return "bg-orange-100 text-orange-600";
    case "LAUNDRY": return "bg-blue-100 text-blue-600";
    case "SPA": return "bg-purple-100 text-purple-600";
    case "MINIBAR": return "bg-amber-100 text-amber-600";
    case "RESTAURANT": return "bg-green-100 text-green-600";
    case "TRANSPORT": return "bg-gray-100 text-gray-600";
    case "ROOM_SERVICE": return "bg-rose-100 text-rose-600";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"CHARGE" | "NOTE" | "REQUEST">("NOTE");
  const [stayModModalOpen, setStayModModalOpen] = useState(false);
  const [stayModType, setStayModType] = useState<"EARLY_CHECKIN" | "LATE_CHECKOUT">("EARLY_CHECKOUT");
  const [pendingRequest, setPendingRequest] = useState<StayModificationRequest | null>(null);
  const [stayModPolicy, setStayModPolicy] = useState<StayModificationPolicy | null>(null);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [addons, setAddons] = useState<BookingAddon[]>([]);
  const [addonTotals, setAddonTotals] = useState<AddonTotals | null>(null);
  const [folioModalOpen, setFolioModalOpen] = useState(false);

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

  async function fetchStayModificationRequest() {
    try {
      const res = await fetch(`/api/bookings/${id}/stay-modification`);
      if (res.ok) {
        const data = await res.json();
        if (data.hasPendingRequest) {
          setPendingRequest(data.request);
          setStayModPolicy(data.policy);
        } else {
          setPendingRequest(null);
          setStayModPolicy(data.policy);
        }
      }
    } catch (err) {
      console.error("Error fetching stay modification request:", err);
    }
  }

  async function fetchAddons() {
    try {
      const res = await fetch(`/api/bookings/${id}/addons`);
      if (res.ok) {
        const data = await res.json();
        setAddons(data.addons || []);
        setAddonTotals(data.totals || null);
      }
    } catch (err) {
      console.error("Error fetching addons:", err);
    }
  }

  async function fetchAddonTypes() {
    try {
      const res = await fetch(`/api/addons/types`);
      if (res.ok) {
        const data = await res.json();
        setAddonTypes(data.addonTypes || []);
      }
    } catch (err) {
      console.error("Error fetching addon types:", err);
    }
  }

  useEffect(() => {
    fetchBooking();
    fetchStayModificationRequest();
    fetchAddons();
    fetchAddonTypes();
  }, [id]);

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

  const handleDeleteAddon = async (addonId: string) => {
    if (!confirm("Delete this add-on?")) return;
    try {
      const res = await fetch(`/api/bookings/${id}/addons/${addonId}`, { method: "DELETE" });
      if (res.ok) {
        fetchAddons();
        fetchBooking();
        alert("Add-on deleted");
      } else {
        alert("Failed to delete add-on");
      }
    } catch (err) {
      alert("Error deleting add-on");
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
        <span className={cn("rounded-full px-4 py-2 text-sm font-medium", booking.status === "CONFIRMED" ? "bg-green-100 text-green-700" : booking.status === "CHECKED_IN" ? "bg-blue-100 text-blue-700" : booking.status === "CHECKED_OUT" ? "bg-gray-100 text-gray-700" : booking.status === "NO_SHOW" ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700")}>{booking.status.replace("_", " ")}</span>
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

          {/* ─── Add-ons / Folio Section ─────────────────────────────────────────── */}
          {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Add-ons / Folio
                  {addonTotals && addonTotals.count > 0 && (
                    <span className="ml-2 rounded-full bg-[#E17055]/10 px-2 py-0.5 text-xs font-medium text-[#E17055]">
                      {addonTotals.count} item{addonTotals.count !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFolioModalOpen(true)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Folio
                  </button>
                  <button
                    onClick={() => setAddonModalOpen(true)}
                    className="text-sm text-[#E17055] hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
              </div>

              {addons.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No add-ons recorded</p>
                  <button
                    onClick={() => setAddonModalOpen(true)}
                    className="mt-3 text-sm text-[#E17055] hover:underline"
                  >
                    Add your first add-on
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addons.slice(0, 5).map((addon) => (
                    <div key={addon.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg", getAddonTypeColor(addon.type))}>
                          {getAddonIcon(addon.type)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">{addon.description}</span>
                          <p className="text-xs text-gray-500">
                            {addon.type} • {formatDate(addon.serviceDate, "short")}
                            {addon.quantity > 1 && ` • Qty: ${addon.quantity}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">{formatCurrency(Number(addon.totalAmount))}</span>
                        <button
                          onClick={() => handleDeleteAddon(addon.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {addons.length > 5 && (
                    <button
                      onClick={() => setFolioModalOpen(true)}
                      className="w-full text-center text-sm text-[#E17055] hover:underline py-2"
                    >
                      View all {addons.length} add-ons
                    </button>
                  )}
                </div>
              )}

              {addonTotals && addonTotals.count > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Add-on Total</span>
                    <span className="font-medium text-[#E17055]">{formatCurrency(addonTotals.total)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment Summary</h3>
            {booking.status === "NO_SHOW" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <span className="text-orange-700 font-medium">No-Show Booking</span>
                </div>
                <div className="flex justify-between text-sm"><span className="text-gray-600">No-Show Charge</span><span className="text-orange-600 font-semibold">{formatCurrency(Number(booking.noShowCharge || 0))}</span></div>
                {booking.noShowAt && <div className="flex justify-between text-sm"><span className="text-gray-600">Marked as No-Show</span><span className="text-gray-900">{formatDate(booking.noShowAt, "short")}</span></div>}
                <div className="flex justify-between text-sm"><span className="text-gray-600">Original Booking Value</span><span className="text-gray-900 line-through">{formatCurrency(Number(booking.totalAmount))}</span></div>
                <div className="flex justify-between font-semibold border-t border-gray-200 pt-3"><span>Total Due</span><span className="text-orange-600">{formatCurrency(Number(booking.noShowCharge || 0))}</span></div>
              </div>
            ) : booking.bookingSource === "COMPLIMENTARY" ? (
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
            {booking.bookingSource !== "COMPLIMENTARY" && booking.status !== "NO_SHOW" && balanceDue > 0 && <Link href={`/payments?booking=${booking.id}`} className="mt-4 block w-full rounded-lg border border-[#E17055] py-2 text-center text-sm font-medium text-[#E17055] hover:bg-[#E17055]/5">Record Payment</Link>}</div>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              {booking.status === "CONFIRMED" && (
                <button onClick={handleCheckIn} className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F]">
                  <CheckCircle className="h-4 w-4" />Check-In Guest
                  {balanceDue > 0 && <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">Balance due</span>}
                </button>
              )}
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

              {/* Stay Modification Requests */}
              {(booking.status === "CONFIRMED" || booking.status === "CHECKED_IN") && (
                <>
                  {pendingRequest ? (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <div className="flex items-center gap-2 text-blue-700">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {pendingRequest.type === "EARLY_CHECKIN" ? "Early Check-in" : "Late Check-out"} Pending
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        {pendingRequest.extraChargeAmount > 0
                          ? `Charge: ${formatCurrency(pendingRequest.extraChargeAmount)}`
                          : "No extra charge"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {stayModPolicy?.earlyCheckinEnabled && (
                        <button
                          onClick={() => { setStayModType("EARLY_CHECKIN"); setStayModModalOpen(true); }}
                          className="w-full rounded-lg border border-blue-200 text-blue-600 py-3 text-center text-sm font-medium hover:bg-blue-50 flex justify-center items-center gap-2"
                        >
                          <ArrowLeft className="h-4 w-4" /> Request Early Check-in
                        </button>
                      )}
                      {stayModPolicy?.lateCheckoutEnabled && (
                        <button
                          onClick={() => { setStayModType("LATE_CHECKOUT"); setStayModModalOpen(true); }}
                          className="w-full rounded-lg border border-blue-200 text-blue-600 py-3 text-center text-sm font-medium hover:bg-blue-50 flex justify-center items-center gap-2"
                        >
                          <ArrowRight className="h-4 w-4" /> Request Late Check-out
                        </button>
                      )}
                    </>
                  )}
                </>
              )}

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
              {booking.status === "CONFIRMED" && (
                <button
                  onClick={async () => {
                    if (confirm("Mark this booking as no-show? A no-show charge will be applied.")) {
                      try {
                        const res = await fetch(`/api/bookings/${booking.id}/no-show`, { method: "POST" });
                        if (res.ok) {
                          fetchBooking();
                          alert("Booking marked as no-show.");
                        } else {
                          const data = await res.json();
                          alert(data.error || "Failed to mark as no-show.");
                        }
                      } catch (error) {
                        alert("An error occurred.");
                      }
                    }
                  }}
                  className="w-full rounded-lg border border-orange-200 text-orange-600 py-3 text-center text-sm font-medium hover:bg-orange-50"
                >
                  Mark as No-Show
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

      {stayModModalOpen && (
        <StayModificationModal
          bookingId={booking.id}
          type={stayModType}
          policy={stayModPolicy}
          onClose={() => setStayModModalOpen(false)}
          onSuccess={() => { setStayModModalOpen(false); fetchStayModificationRequest(); }}
        />
      )}

      {addonModalOpen && (
        <AddonModal
          bookingId={booking.id}
          addonTypes={addonTypes}
          onClose={() => setAddonModalOpen(false)}
          onSuccess={() => { setAddonModalOpen(false); fetchAddons(); fetchBooking(); }}
        />
      )}

      {folioModalOpen && (
        <FolioModal
          bookingId={booking.id}
          onClose={() => setFolioModalOpen(false)}
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

interface StayModificationPolicy {
  earlyCheckinEnabled: boolean;
  earlyCheckinCutoffHour: number;
  earlyCheckinChargeType: string;
  lateCheckoutEnabled: boolean;
  lateCheckoutCutoffHour: number;
  lateCheckoutChargeType: string;
  lateCheckoutMaxHour: number;
}

function AddonModal({ bookingId, addonTypes, onClose, onSuccess }: { bookingId: string, addonTypes: AddonType[], onClose: () => void, onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedAddonType = addonTypes.find(t => t.type === selectedType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !description || !amount) {
      setError("Please fill all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          description,
          amount: Number(amount),
          quantity: Number(quantity) || 1,
          serviceDate,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add addon");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Add Add-on</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add-on Type *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {addonTypes.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type.type);
                    setDescription(type.name);
                    if (type.defaultPrice > 0) {
                      setAmount(type.defaultPrice.toString());
                    }
                  }}
                  className={cn(
                    "p-3 rounded-lg border text-center transition-colors",
                    selectedType === type.type
                      ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                      : "border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className={cn("mx-auto mb-1", getAddonTypeColor(type.type), "w-8 h-8 rounded-lg flex items-center justify-center")}>
                    {getAddonIcon(type.type)}
                  </div>
                  <span className="text-xs font-medium">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Laundry - 3 pieces"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Service Date *</label>
            <input
              type="date"
              required
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          {selectedAddonType && Number(amount) > 0 && (
            <div className="rounded-lg bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Price Summary</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal ({quantity} x ₹{amount})</span>
                  <span>₹{(Number(quantity) * Number(amount)).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>CGST (9%)</span>
                  <span>₹{((Number(quantity) * Number(amount) * 0.09).toFixed(2))}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST (9%)</span>
                  <span>₹{((Number(quantity) * Number(amount) * 0.09).toFixed(2))}</span>
                </div>
                <div className="flex justify-between font-medium border-t border-gray-200 pt-1 mt-1">
                  <span>Total</span>
                  <span className="text-[#E17055]">₹{((Number(quantity) * Number(amount) * 1.18).toFixed(2))}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Add Add-on"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FolioModal({ bookingId, onClose }: { bookingId: string, onClose: () => void }) {
  const [folio, setFolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolio();
  }, [bookingId]);

  async function fetchFolio() {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/folio`);
      if (res.ok) {
        const data = await res.json();
        setFolio(data);
      }
    } catch (err) {
      console.error("Error fetching folio:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Guest Folio</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
          </div>
        ) : folio ? (
          <div className="p-6">
            {/* Booking Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Booking #{folio.booking?.bookingNumber}</h4>
              <p className="text-sm text-gray-600">
                {formatDate(folio.booking?.checkIn, "short")} - {formatDate(folio.booking?.checkOut, "short")}
              </p>
            </div>

            {/* Room Charges */}
            {folio.roomCharges?.items?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Bed className="h-4 w-4" /> Room Charges
                </h4>
                <div className="space-y-2">
                  {folio.roomCharges.items.map((charge: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div>
                        <span className="font-medium">{formatDate(charge.chargeDate, "short")}</span>
                        <p className="text-xs text-gray-500">Room Rate: ₹{charge.roomRate}</p>
                      </div>
                      <span className="font-medium">{formatCurrency(charge.totalAmount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between items-center p-3 bg-gray-100 rounded-lg font-medium">
                  <span>Room Charges Total</span>
                  <span className="text-[#E17055]">{formatCurrency(folio.roomCharges.total)}</span>
                </div>
              </div>
            )}

            {/* Add-on Charges by Category */}
            {folio.addons?.items?.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Add-on Charges
                </h4>
                <div className="space-y-2">
                  {folio.addons.items.map((addon: any) => (
                    <div key={addon.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", getAddonTypeColor(addon.type))}>
                          {getAddonIcon(addon.type)}
                        </div>
                        <div>
                          <span className="font-medium">{addon.description}</span>
                          <p className="text-xs text-gray-500">
                            {addon.type} • {formatDate(addon.serviceDate, "short")}
                            {addon.quantity > 1 && ` • Qty: ${addon.quantity}`}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium">{formatCurrency(addon.totalAmount)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex justify-between items-center p-3 bg-gray-100 rounded-lg font-medium">
                  <span>Add-on Total</span>
                  <span className="text-[#E17055]">{formatCurrency(folio.addons.total)}</span>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="border-t-2 border-gray-300 pt-4">
              <div className="flex justify-between items-center p-4 bg-[#E17055]/5 rounded-lg">
                <span className="text-lg font-semibold text-gray-900">Grand Total</span>
                <span className="text-xl font-bold text-[#E17055]">{formatCurrency(folio.grandTotal?.total || 0)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Room Charges</span>
                  <span>{formatCurrency(folio.grandTotal?.roomCharges || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Add-ons</span>
                  <span>{formatCurrency(folio.grandTotal?.addons || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">No folio data available</div>
        )}
      </div>
    </div>
  );
}

function StayModificationModal({ bookingId, type, policy, onClose, onSuccess }: { bookingId: string, type: "EARLY_CHECKIN" | "LATE_CHECKOUT", policy: StayModificationPolicy | null, onClose: () => void, onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [requestedTime, setRequestedTime] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        type,
        reason,
        notes,
      };

      if (type === "EARLY_CHECKIN" && requestedTime) {
        body.requestedCheckIn = new Date(requestedTime).toISOString();
      } else if (type === "LATE_CHECKOUT" && requestedTime) {
        body.requestedCheckOut = new Date(requestedTime).toISOString();
      }

      const res = await fetch(`/api/bookings/${bookingId}/stay-modification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        onSuccess();
        alert(data.message || "Request submitted successfully");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit request");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const isEarlyCheckin = type === "EARLY_CHECKIN";
  const cutoffHour = isEarlyCheckin ? policy?.earlyCheckinCutoffHour ?? 10 : policy?.lateCheckoutCutoffHour ?? 12;
  const maxHour = policy?.lateCheckoutMaxHour ?? 16;
  const chargeType = isEarlyCheckin ? policy?.earlyCheckinChargeType : policy?.lateCheckoutChargeType;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">
            {isEarlyCheckin ? "Request Early Check-in" : "Request Late Check-out"}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Policy Information</h4>
            <div className="text-xs text-blue-600 space-y-1">
              <p>Free {isEarlyCheckin ? "before" : "until"} {cutoffHour}:00</p>
              <p>Charge type: {chargeType || "HALF_DAY"}</p>
              {!isEarlyCheckin && <p>Latest checkout: {maxHour}:00</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEarlyCheckin ? "Requested Check-in Time" : "Requested Check-out Time"} *
            </label>
            <input
              type="datetime-local"
              required
              value={requestedTime}
              onChange={(e) => setRequestedTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Early flight arrival, Late flight departure"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div className="pt-4">
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Submit Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
