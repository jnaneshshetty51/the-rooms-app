"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, Receipt, Mail, Download, Clock, AlertTriangle, DollarSign } from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  paymentStatus: string;
  checkIn: string;
  checkOut: string;
  totalAmount: string;
  guest: { name: string; phone: string; email?: string };
  room: { roomNumber: string; type: string };
  payments: Array<{ id: string; amount: string; method: string; status: string }>;
  damageAssessments?: Array<{ id: string; amount: string; status: string; type: string; description: string }>;
  lateCheckoutFee?: { amount: string; reason: string };
  expressCheckoutEligible?: boolean;
  expressCheckoutSession?: { id: string; status: string };
}

export default function CheckOutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [finalPayment, setFinalPayment] = useState(0);
  const [refundAmount, setRefundAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [sendInvoice, setSendInvoice] = useState(true);
  const [invoiceReady, setInvoiceReady] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        if (data.status === "CHECKED_OUT") setError("Already checked out");
        setBooking(data);

        const paid = data.payments.filter((p: { status: string }) => p.status === "PAID").reduce((s: number, p: { amount: string }) => s + Number(p.amount), 0);
        const balance = Number(data.totalAmount) - paid;
        if (balance > 0) {
          setFinalPayment(balance);
        } else if (balance < 0) {
          setRefundAmount(Math.abs(balance));
        }
      }
      catch (err) { setError(err instanceof Error ? err.message : "Unknown"); }
      finally { setLoading(false); }
    }
    fetchBooking();
  }, [id]);

  const handleCheckOut = async () => {
    try {
      // Auto check-in if booking is CONFIRMED (express checkout)
      if (booking?.status === "CONFIRMED") {
        const ciRes = await fetch(`/api/bookings/${id}/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (!ciRes.ok) throw new Error("Failed to check in guest before checkout");
      }

      const res = await fetch(`/api/bookings/${id}/check-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          finalPayment: finalPayment > 0 ? finalPayment : (refundAmount > 0 ? -refundAmount : 0),
          paymentMethod,
          notes: sendInvoice ? "Invoice requested" : undefined,
          sendInvoice
        })
      });

      if (!res.ok) throw new Error("Failed");
      setComplete(true);
      if (sendInvoice) setInvoiceReady(true);
    }
    catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
  };

  const handleDownloadInvoice = async () => {
    try {
      const res = await fetch(`/api/bookings/${id}/invoice`);
      if (res.ok) {
        const data = await res.json();
        if (data.pdfUrl) {
          window.open(data.pdfUrl, "_blank");
        } else {
          alert("Invoice PDF is not available yet.");
        }
      } else {
        alert("Failed to load invoice.");
      }
    } catch (err) {
      alert("Error opening invoice.");
    }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (error && !booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error}</p><Link href={`/bookings/${id}`} className="mt-4 text-[#E17055]">Back</Link></div></div>;

  if (complete) return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="rounded-xl border bg-white p-8 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto"><CheckCircle className="h-10 w-10 text-green-600" /></div>
        <div>
          <h3 className="text-2xl font-bold">Check-Out Complete!</h3>
          <p className="text-gray-500 mt-2">{booking?.guest.name} checked out of Room {booking?.room.roomNumber}</p>
        </div>
        <p className="text-sm text-green-600">Room {booking?.room.roomNumber} is now Vacant</p>

        {invoiceReady && (
          <button onClick={handleDownloadInvoice} className="mx-auto flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" /> Download Invoice
          </button>
        )}

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 border border-gray-300 py-3 text-center rounded-lg font-medium text-gray-700 hover:bg-gray-50">Dashboard</Link>
          <Link href="/rooms/board" className="flex-1 bg-[#E17055] py-3 text-center rounded-lg font-medium text-white hover:bg-[#D35B3F]">Room Board</Link>
        </div>
      </div>
    </div>
  );

  const totalPaid = booking?.payments.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const totalAmount = Number(booking?.totalAmount ?? 0);
  const balanceDue = totalAmount - totalPaid;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/bookings/${id}`} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Check-Out</h2>
          <p className="text-gray-500">Booking #{booking?.bookingNumber} • Room {booking?.room?.roomNumber}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#E17055] flex items-center justify-center">
            <span className="text-white font-bold text-lg">{booking?.guest.name.charAt(0)}</span>
          </div>
          <div>
            <p className="font-medium">{booking?.guest.name}</p>
            <p className="text-sm text-gray-500">Check-in: {formatDate(booking?.checkIn ?? "", "short")}</p>
          </div>
        </div>
      </div>

      {/* Late Checkout Fee Section */}
      {booking?.lateCheckoutFee && Number(booking.lateCheckoutFee.amount) > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-orange-800">
            <Clock className="h-5 w-5" /> Late Checkout Fee
          </h3>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-orange-700">{booking.lateCheckoutFee.reason || "Late checkout charges applied"}</p>
            </div>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(Number(booking.lateCheckoutFee.amount))}</p>
          </div>
        </div>
      )}

      {/* Damage Charges Section */}
      {booking?.damageAssessments && booking.damageAssessments.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" /> Damage Charges
          </h3>
          {booking.damageAssessments
            .filter((d) => d.status === "APPROVED" || d.status === "ADDED_TO_FOLIO")
            .map((damage) => (
              <div key={damage.id} className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-red-700">{damage.type.replace("_", " ")}</p>
                  <p className="text-xs text-red-600">{damage.description}</p>
                </div>
                <p className="font-semibold text-red-600">{formatCurrency(Number(damage.amount))}</p>
              </div>
            ))}
          <div className="flex justify-between font-semibold border-t border-red-200 pt-2">
            <span>Total Damage Charges</span>
            <span className="text-red-600">
              {formatCurrency(
                booking.damageAssessments
                  .filter((d) => d.status === "APPROVED" || d.status === "ADDED_TO_FOLIO")
                  .reduce((sum, d) => sum + Number(d.amount), 0)
              )}
            </span>
          </div>
        </div>
      )}

      {/* Pending Dues Warning */}
      {balanceDue > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-orange-800">Pending Dues</p>
              <p className="text-sm text-orange-700 mt-1">
                Guest has pending dues of {formatCurrency(balanceDue)}. Please collect payment before check-out.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Receipt className="h-5 w-5" />Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span className="text-gray-600">Total</span><span>{formatCurrency(totalAmount)}</span></div>
          <div className="flex justify-between text-sm text-green-600"><span>Paid</span><span>-{formatCurrency(totalPaid)}</span></div>
          {booking?.lateCheckoutFee && Number(booking.lateCheckoutFee.amount) > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Late Checkout Fee</span>
              <span>+{formatCurrency(Number(booking.lateCheckoutFee.amount))}</span>
            </div>
          )}
          {booking?.damageAssessments && booking.damageAssessments.filter((d) => d.status === "APPROVED" || d.status === "ADDED_TO_FOLIO").length > 0 && (
            <div className="flex justify-between text-sm text-red-600">
              <span>Damage Charges</span>
              <span>+{formatCurrency(booking.damageAssessments.filter((d) => d.status === "APPROVED" || d.status === "ADDED_TO_FOLIO").reduce((sum, d) => sum + Number(d.amount), 0))}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Balance</span>
            <span className={balanceDue > 0 ? "text-orange-600" : (balanceDue < 0 ? "text-blue-600" : "text-green-600")}>
              {balanceDue < 0 ? `Overpaid ${formatCurrency(Math.abs(balanceDue))}` : formatCurrency(balanceDue)}
            </span>
          </div>
        </div>

        {balanceDue > 0 ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Collect Payment</label>
              <input type="number" value={finalPayment} onChange={(e) => setFinalPayment(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 rounded-lg border text-lg font-semibold" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Method</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={cn("rounded-lg border-2 py-3 text-sm font-medium", paymentMethod === m ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600")}>{m.replace("_", " ")}</button>
                ))}
              </div>
            </div>
          </>
        ) : balanceDue < 0 ? (
          <>
            <div>
              <label className="block text-sm font-medium mb-2 text-blue-700">Refund Amount</label>
              <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3 rounded-lg border border-blue-300 bg-blue-50 text-blue-900 text-lg font-semibold" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Refund Method</label>
              <div className="grid grid-cols-2 gap-3">
                {["CASH", "BANK_TRANSFER"].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} className={cn("rounded-lg border-2 py-3 text-sm font-medium", paymentMethod === m ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600")}>{m.replace("_", " ")}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <span className="flex items-center gap-2 text-green-700 font-medium"><CheckCircle className="h-5 w-5" />Fully Paid</span>
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <div>
              <p className="font-medium">Send Invoice</p>
              <p className="text-sm text-gray-500">{booking?.guest.email ?? "No email"}</p>
            </div>
          </div>
          <button onClick={() => setSendInvoice(!sendInvoice)} className={cn("relative inline-flex h-6 w-11 items-center rounded-full transition-colors", sendInvoice ? "bg-[#E17055]" : "bg-gray-300")}>
            <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white transition-transform", sendInvoice ? "translate-x-6" : "translate-x-1")} />
          </button>
        </div>
      </div>

      {/* Express Checkout Option */}
      {booking?.expressCheckoutEligible && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Express Checkout Available</p>
                <p className="text-sm text-blue-700">Guest can complete check-out via guest portal</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {booking.expressCheckoutSession ? (
                <span className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  booking.expressCheckoutSession.status === "COMPLETED"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                )}>
                  {booking.expressCheckoutSession.status.replace("_", " ")}
                </span>
              ) : (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Eligible
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <button onClick={handleCheckOut} className="w-full rounded-lg bg-[#E17055] py-4 text-white hover:bg-[#D35B3F] flex items-center justify-center gap-2">
        <CheckCircle className="h-5 w-5" />Complete Check-Out
      </button>
    </div>
  );
}
