"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, RefreshCw, ArrowLeftRight, CheckCircle2, Clock } from "lucide-react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Badge,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

type Payment = {
    id: string;
    amount: number;
    method: string;
    status: string;
    transactionId?: string;
    createdAt: string;
    booking?: {
        id: string;
        bookingNumber: string;
        room: {
            roomNumber: string;
            type: string;
        };
    };
};

const STATUS_COLORS: Record<string, string> = {
    COMPLETED: "bg-[#00B894]/10 text-[#00B894] border-[#00B894]/20",
    PENDING: "bg-[#FDCB6E]/10 text-[#D4A500] border-[#FDCB6E]/20",
    FAILED: "bg-[#FF7675]/10 text-[#D63031] border-[#FF7675]/20",
    REFUNDED: "bg-[#0984E3]/10 text-[#0984E3] border-[#0984E3]/20",
};

const METHOD_ICONS: Record<string, string> = {
    CARD: "💳",
    UPI: "📱",
    NET_BANKING: "🏦",
    CASH: "💵",
    CORPORATE: "🏢",
    ONLINE: "🌐",
};

export default function PaymentsPage() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [refunds, setRefunds] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("payments");

    useEffect(() => {
        async function fetchPayments() {
            try {
                const res = await fetch("/api/payments");
                if (res.ok) {
                    const data = await res.json();
                    setPayments(data.payments ?? []);
                    setRefunds(data.refunds ?? []);
                }
            } catch (err) {
                console.error("Error fetching payments:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchPayments();
    }, []);

    const totalPaid = payments
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + p.amount, 0);

    const totalRefunded = refunds
        .filter((r) => r.status === "COMPLETED")
        .reduce((sum, r) => sum + r.amount, 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
            </div>
        );
    }

    const renderPaymentItem = (payment: Payment, isRefund = false) => (
        <Card key={payment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
                            <span className="text-lg">
                                {METHOD_ICONS[payment.method] ?? "💰"}
                            </span>
                        </div>
                        <div>
                            <p className="font-medium text-[#2D3436]">
                                {payment.method.replace("_", " ")}
                            </p>
                            <p className="text-sm text-[#636E72]">
                                {payment.booking
                                    ? `Room ${payment.booking.room.roomNumber} · ${payment.booking.bookingNumber}`
                                    : "Booking payment"}
                            </p>
                            <p className="text-xs text-[#B2BEC3] mt-1">
                                {formatDate(payment.createdAt, "long")}
                            </p>
                            {payment.transactionId && (
                                <p className="text-xs text-[#B2BEC3]">
                                    Txn ID: {payment.transactionId}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <p className={`font-bold ${isRefund ? "text-[#0984E3]" : "text-[#2D3436]"}`}>
                            {isRefund ? "+" : ""}{formatCurrency(payment.amount)}
                        </p>
                        <Badge className={STATUS_COLORS[payment.status] ?? ""}>
                            {payment.status === "COMPLETED" ? (
                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Completed</>
                            ) : payment.status === "PENDING" ? (
                                <><Clock className="w-3 h-3 mr-1" /> Pending</>
                            ) : payment.status === "REFUNDED" ? (
                                <><ArrowLeftRight className="w-3 h-3 mr-1" /> Refunded</>
                            ) : (
                                payment.status
                            )}
                        </Badge>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#2D3436]">Payment History</h1>
                <p className="text-sm text-[#636E72] mt-1">
                    View all your payments and refunds
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#2D3436]">
                            {formatCurrency(totalPaid)}
                        </p>
                        <p className="text-xs text-[#636E72] mt-1">Total Paid</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 text-center">
                        <p className="text-2xl font-bold text-[#0984E3]">
                            {formatCurrency(totalRefunded)}
                        </p>
                        <p className="text-xs text-[#636E72] mt-1">Total Refunded</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="payments">
                        Payments ({payments.length})
                    </TabsTrigger>
                    <TabsTrigger value="refunds">
                        Refunds ({refunds.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="payments" className="mt-4">
                    {payments.length === 0 ? (
                        <Card className="border-dashed border-2 border-[#E5E5E5]">
                            <CardContent className="py-12 text-center">
                                <CreditCard className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                                <p className="text-[#636E72] font-medium">No payments yet</p>
                                <p className="text-sm text-[#B2BEC3] mt-1">
                                    Your payment history will appear here
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment) => renderPaymentItem(payment))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="refunds" className="mt-4">
                    {refunds.length === 0 ? (
                        <Card className="border-dashed border-2 border-[#E5E5E5]">
                            <CardContent className="py-12 text-center">
                                <RefreshCw className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
                                <p className="text-[#636E72] font-medium">No refunds yet</p>
                                <p className="text-sm text-[#B2BEC3] mt-1">
                                    Any refunds will appear here
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="space-y-3">
                            {refunds.map((refund) => renderPaymentItem(refund, true))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}