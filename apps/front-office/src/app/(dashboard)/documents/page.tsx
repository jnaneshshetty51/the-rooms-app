"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  ArrowLeft,
  Camera,
  Upload,
  CheckCircle,
  Clock,
  FileText,
  Eye,
  Search,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface Document {
  id: string;
  documentType: string;
  frontUrl: string;
  backUrl?: string;
  verified: boolean;
  verifiedAt?: string;
  uploadedAt: string;
  guest: {
    id: string;
    name: string;
    phone: string;
  };
  booking?: {
    id: string;
    bookingNumber: string;
  };
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("pending");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchDocuments() {
      try {
        // In production, this would be /api/documents with filters
        // For now, return empty array as documents are linked to bookings
        setDocuments([]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, []);

  const filteredDocs = documents.filter((doc) => {
    if (filter === "pending") return !doc.verified;
    if (filter === "verified") return doc.verified;
    return true;
  });

  const pendingCount = documents.filter((d) => !d.verified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
        <p className="text-gray-500">Upload and verify guest identity documents</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200">
        <button
          onClick={() => setFilter("pending")}
          className={cn(
            "flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors",
            filter === "pending"
              ? "border-[#E17055] text-[#E17055]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <Clock className="h-4 w-4" />
          Pending Verification
          {pendingCount > 0 && (
            <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setFilter("verified")}
          className={cn(
            "flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors",
            filter === "verified"
              ? "border-[#E17055] text-[#E17055]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          <CheckCircle className="h-4 w-4" />
          Verified
        </button>
        <button
          onClick={() => setFilter("all")}
          className={cn(
            "pb-3 px-1 border-b-2 text-sm font-medium transition-colors",
            filter === "all"
              ? "border-[#E17055] text-[#E17055]"
              : "border-transparent text-gray-500 hover:text-gray-700"
          )}
        >
          All
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by guest name or booking number..."
          className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredDocs.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filter === "pending"
              ? "No documents pending verification"
              : filter === "verified"
              ? "No verified documents"
              : "No documents found"}
          </p>
        </div>
      )}

      {/* Documents List */}
      {!loading && filteredDocs.length > 0 && (
        <div className="space-y-4">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="rounded-xl border border-gray-200 bg-white hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {doc.guest.name}
                      </h3>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {doc.documentType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{doc.guest.phone}</p>
                    {doc.booking && (
                      <Link
                        href={`/bookings/${doc.booking.id}`}
                        className="text-sm text-[#E17055] hover:underline"
                      >
                        Booking #{doc.booking.bookingNumber}
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.verified ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        <CheckCircle className="h-4 w-4" />
                        Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                        <Clock className="h-4 w-4" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  {doc.frontUrl && (
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4" />
                      View Front
                    </button>
                  )}
                  {doc.backUrl && (
                    <button
                      onClick={() => setSelectedDoc(doc)}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4" />
                      View Back
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Uploaded {formatDate(doc.uploadedAt, "short")}
                </p>
              </div>

              {!doc.verified && (
                <div className="border-t border-gray-100 px-6 py-3 flex gap-3">
                  <button className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verify Document
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedDoc.guest.name}</h3>
                <p className="text-sm text-gray-500">{selectedDoc.documentType}</p>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {selectedDoc.frontUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Front Side</p>
                    <img
                      src={selectedDoc.frontUrl}
                      alt="Front"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}
                {selectedDoc.backUrl && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Back Side</p>
                    <img
                      src={selectedDoc.backUrl}
                      alt="Back"
                      className="w-full rounded-lg border border-gray-200"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
