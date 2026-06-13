"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  CreditCard,
  Plus,
  Search,
  Calendar,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { formatDate, formatCurrency } from "@the-rooms/ui";

interface Payment {
  id: string;
  amount: string;
  method: string;
  status: string;
  transactionId?: string;
  createdAt: string;
  booking?: {
    id: string;
    bookingNumber: string;
    guest: {
      name: string;
      phone: string;
    };
    room: {
      roomNumber: string;
    };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "today" | "week">("today");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  useEffect(() => {
    async function fetchPayments() {
      setLoading(true);
      try {
        const now = new Date();
        const params = new URLSearchParams();
        if (filter === "today") {
          const start = new Date(now); start.setHours(0, 0, 0, 0);
          const end = new Date(now); end.setHours(23, 59, 59, 999);
          params.set("from", start.toISOString());
          params.set("to", end.toISOString());
        } else if (filter === "week") {
          const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
          params.set("from", start.toISOString());
          params.set("to", new Date(now.setHours(23, 59, 59, 999)).toISOString());
        }
        const res = await fetch(`/api/payments?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPayments(data.payments ?? []);
        } else {
          throw new Error("Failed to fetch payments");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPayments();
  }, [filter]);

  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const guestName = payment.booking?.guest.name.toLowerCase() ?? "";
    const bookingNumber = payment.booking?.bookingNumber.toLowerCase() ?? "";
    const query = searchQuery.toLowerCase();
    return guestName.includes(query) || bookingNumber.includes(query);
  });

  const totalRevenue = filteredPayments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
          <p className="text-gray-500">Record and track all payments</p>
        </div>
        <button
          onClick={() => setShowRecordPayment(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
        >
          <Plus className="h-4 w-4" />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Today&apos;s Collection</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="rounded-lg bg-green-100 p-3">
              <ArrowUpRight className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{filteredPayments.length}</p>
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
              <CreditCard className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Average Transaction</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {filteredPayments.length > 0
                  ? formatCurrency(totalRevenue / filteredPayments.length)
                  : "₹0"}
              </p>
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <CreditCard className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter("today")}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors",
              filter === "today"
                ? "border-b-2 border-[#E17055] text-[#E17055]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            Today
          </button>
          <button
            onClick={() => setFilter("week")}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors",
              filter === "week"
                ? "border-b-2 border-[#E17055] text-[#E17055]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            This Week
          </button>
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "pb-3 px-1 text-sm font-medium transition-colors",
              filter === "all"
                ? "border-b-2 border-[#E17055] text-[#E17055]"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            All
          </button>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest or booking..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredPayments.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No payments found</p>
        </div>
      )}

      {/* Payments List */}
      {!loading && filteredPayments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guest</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {formatDate(payment.createdAt, "short")}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">
                      {payment.booking?.guest.name ?? "N/A"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {payment.booking?.guest.phone ?? ""}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {payment.booking ? (
                      <Link
                        href={`/bookings/${payment.booking.id}`}
                        className="text-sm text-[#E17055] hover:underline"
                      >
                        #{payment.booking.bookingNumber}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                      {payment.method.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-medium",
                        payment.status === "PAID"
                          ? "bg-green-100 text-green-700"
                          : payment.status === "PENDING"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <RecordPaymentModal onClose={() => setShowRecordPayment(false)} />
      )}
    </div>
  );
}

function RecordPaymentModal({ onClose }: { onClose: () => void }) {
  const [bookingId, setBookingId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: parseFloat(amount),
          method,
          transactionId: transactionId || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment");
      }

      onClose();
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record payment");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Booking ID *
            </label>
            <input
              type="text"
              value={bookingId}
              onChange={(e) => setBookingId(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              placeholder="Enter booking ID"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["CASH", "UPI", "CARD", "BANK_TRANSFER"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "rounded-lg border-2 py-2 text-sm font-medium transition-all",
                    method === m
                      ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]"
                      : "border-gray-200 text-gray-600"
                  )}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction ID (Optional)
            </label>
            <input
              type="text"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              placeholder="Enter transaction ID"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Record Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
