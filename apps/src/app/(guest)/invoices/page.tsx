"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Loader2, FileText, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@the-rooms/ui";
import { formatDate, formatCurrency } from "@the-rooms/ui";

type Invoice = {
  id: string;
  invoiceNumber: string;
  pdfUrl?: string;
  issuedAt: string;
  booking: {
    id: string;
    bookingNumber: string;
    checkIn: string;
    checkOut: string;
    totalAmount: string;
    room: { roomNumber: string; type: string };
  };
  payment: {
    id: string;
    amount: string;
    method: string;
    transactionId?: string;
    status: string;
  };
};

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvoices() {
      try {
        const res = await fetch("/api/invoices");
        if (res.ok) {
          const data = await res.json();
          setInvoices(data.invoices ?? []);
        }
      } catch (err) {
        console.error("Error fetching invoices:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvoices();
  }, []);

  async function handleDownload(invoice: Invoice) {
    setDownloadingId(invoice.id);
    try {
      // If PDF URL exists, open it
      if (invoice.pdfUrl) {
        window.open(invoice.pdfUrl, "_blank");
      } else {
        // Generate/download invoice
        const res = await fetch(`/api/invoices?id=${invoice.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.invoice?.pdfUrl) {
            window.open(data.invoice.pdfUrl, "_blank");
          }
        }
      }
    } catch (err) {
      console.error("Download error:", err);
    } finally {
      setDownloadingId(null);
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
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Invoices</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Download and view all your booking invoices
        </p>
      </div>

      {invoices.length === 0 ? (
        <Card className="border-dashed border-2 border-[#E5E5E5]">
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
            <p className="text-[#636E72] font-medium">No invoices yet</p>
            <p className="text-sm text-[#B2BEC3] mt-1">
              Invoices are generated after payment confirmation
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E17055]/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#E17055]" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#2D3436]">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-sm text-[#636E72]">
                        Room {invoice.booking.room.roomNumber} ·{" "}
                        {invoice.booking.room.type}
                      </p>
                      <p className="text-xs text-[#B2BEC3] mt-1">
                        {formatDate(invoice.booking.checkIn)} —{" "}
                        {formatDate(invoice.booking.checkOut)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{invoice.payment.method}</Badge>
                        <Badge
                          variant={
                            invoice.payment.status === "PAID"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            invoice.payment.status === "PAID"
                              ? "bg-[#00B894] text-white"
                              : ""
                          }
                        >
                          {invoice.payment.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-[#2D3436]">
                      {formatCurrency(Number(invoice.payment.amount))}
                    </p>
                    <p className="text-xs text-[#B2BEC3]">
                      Issued {formatDate(invoice.issuedAt)}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => handleDownload(invoice)}
                      disabled={downloadingId === invoice.id}
                    >
                      {downloadingId === invoice.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
