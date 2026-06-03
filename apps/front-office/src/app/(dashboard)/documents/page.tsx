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
  Plus,
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
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    setLoading(true);
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents ?? []);
      } else {
        throw new Error("Failed to fetch documents");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/verify`, { method: "PATCH" });
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((doc) =>
            doc.id === docId ? { ...doc, verified: true, verifiedAt: new Date().toISOString() } : doc
          )
        );
      } else {
        alert("Failed to verify document");
      }
    } catch (err) {
      alert("An error occurred");
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === "pending" && doc.verified) return false;
    if (filter === "verified" && !doc.verified) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const guestName = doc.guest.name.toLowerCase();
      const bookingNumber = doc.booking?.bookingNumber.toLowerCase() ?? "";
      return guestName.includes(q) || bookingNumber.includes(q);
    }
    return true;
  });

  const pendingCount = documents.filter((d) => !d.verified).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-500">Upload and verify guest identity documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]"
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
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
                  <button 
                    onClick={() => handleVerify(doc.id)}
                    className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center justify-center gap-2"
                  >
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {showUploadModal && (
        <UploadDocumentModal 
          onClose={() => setShowUploadModal(false)} 
          onSuccess={() => {
            setShowUploadModal(false);
            fetchDocuments();
          }} 
        />
      )}
    </div>
  );
}

function UploadDocumentModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [searchPhone, setSearchPhone] = useState("");
  const [guest, setGuest] = useState<{ id: string; name: string } | null>(null);
  const [documentType, setDocumentType] = useState("AADHAR");
  const [frontUrl, setFrontUrl] = useState("");
  const [backUrl, setBackUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGuest = async () => {
    if (searchPhone.length < 10) return;
    try {
      const res = await fetch(`/api/guests/search?query=${searchPhone}`);
      if (res.ok) {
        const data = await res.json();
        if (data.guests && data.guests.length > 0) {
          setGuest(data.guests[0]);
          setError(null);
        } else {
          setGuest(null);
          setError("Guest not found. Please verify phone number.");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guest) {
      setError("Please select a guest first");
      return;
    }
    if (!frontUrl) {
      setError("Front image URL is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestId: guest.id,
          documentType,
          frontUrl,
          backUrl: backUrl || undefined,
        }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to upload document");
      }
    } catch (err) {
      setError("An error occurred during upload");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upload Guest Document</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Find Guest (Phone)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="Enter guest phone number"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              />
              <button
                type="button"
                onClick={searchGuest}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Search
              </button>
            </div>
            {guest && (
              <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Found: {guest.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            >
              <option value="AADHAR">Aadhar Card</option>
              <option value="PAN">PAN Card</option>
              <option value="PASSPORT">Passport</option>
              <option value="DRIVING_LICENSE">Driving License</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Front Image URL *
            </label>
            <input
              type="text"
              value={frontUrl}
              onChange={(e) => setFrontUrl(e.target.value)}
              required
              placeholder="https://example.com/front.jpg"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Back Image URL (Optional)
            </label>
            <input
              type="text"
              value={backUrl}
              onChange={(e) => setBackUrl(e.target.value)}
              placeholder="https://example.com/back.jpg"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || !guest}
              className="w-full rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
