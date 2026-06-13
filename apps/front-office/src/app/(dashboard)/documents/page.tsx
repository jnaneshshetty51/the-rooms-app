"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import {
  Loader2,
  CheckCircle,
  Clock,
  FileText,
  Search,
  Upload,
  Camera,
  X,
  ZoomIn,
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
  guest: { id: string; name: string; phone: string };
  booking?: { id: string; bookingNumber: string };
}

// ─── Document Type Labels ───────────────────────────────────────────────────
const DOC_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar Card",
  PAN: "PAN Card",
  PASSPORT: "Passport",
  VOTER_ID: "Voter ID",
  DRIVING_LICENSE: "Driving License",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified">("pending");
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
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
            doc.id === docId
              ? { ...doc, verified: true, verifiedAt: new Date().toISOString() }
              : doc
          )
        );
      } else {
        alert("Failed to verify document");
      }
    } catch {
      alert("An error occurred");
    }
  };

  const filteredDocs = documents.filter((doc) => {
    if (filter === "pending" && doc.verified) return false;
    if (filter === "verified" && !doc.verified) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.guest.name.toLowerCase().includes(q) ||
        (doc.booking?.bookingNumber.toLowerCase().includes(q) ?? false)
      );
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
        {(["pending", "verified", "all"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={cn(
              "flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-medium transition-colors capitalize",
              filter === tab
                ? "border-[#E17055] text-[#E17055]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab === "pending" ? <Clock className="h-4 w-4" /> : tab === "verified" ? <CheckCircle className="h-4 w-4" /> : null}
            {tab === "pending" ? "Pending Verification" : tab === "verified" ? "Verified" : "All"}
            {tab === "pending" && pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
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

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#E17055]" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
      )}

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
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{doc.guest.name}</h3>
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
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
                  <div>
                    {doc.verified ? (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                        <CheckCircle className="h-4 w-4" />Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                        <Clock className="h-4 w-4" />Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Thumbnails */}
                <div className="mt-4 flex gap-3">
                  {doc.frontUrl && (
                    <button
                      onClick={() => setViewerUrl(doc.frontUrl)}
                      className="group relative w-24 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-[#E17055]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.frontUrl} alt="Front" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">Front</span>
                    </button>
                  )}
                  {doc.backUrl && (
                    <button
                      onClick={() => setViewerUrl(doc.backUrl!)}
                      className="group relative w-24 h-16 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 hover:border-[#E17055]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={doc.backUrl} alt="Back" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <ZoomIn className="h-5 w-5 text-white" />
                      </div>
                      <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">Back</span>
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-400">
                  Uploaded {formatDate(doc.uploadedAt, "short")}
                  {doc.verifiedAt && ` · Verified ${formatDate(doc.verifiedAt, "short")}`}
                </p>
              </div>

              {!doc.verified && (
                <div className="border-t border-gray-100 px-6 py-3">
                  <button
                    onClick={() => handleVerify(doc.id)}
                    className="w-full rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Mark as Verified
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Image Viewer */}
      {viewerUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setViewerUrl(null)}
        >
          <button
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setViewerUrl(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewerUrl}
            alt="Document"
            className="max-w-full max-h-[90vh] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
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

// ─── Upload Modal ───────────────────────────────────────────────────────────

function UploadDocumentModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [guest, setGuest] = useState<{ id: string; name: string; phone: string } | null>(null);
  const [documentType, setDocumentType] = useState("AADHAAR");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (
    file: File,
    side: "front" | "back"
  ) => {
    const preview = URL.createObjectURL(file);
    if (side === "front") {
      setFrontFile(file);
      setFrontPreview(preview);
    } else {
      setBackFile(file);
      setBackPreview(preview);
    }
  };

  const searchGuest = async () => {
    if (searchQuery.length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.guests?.length > 0) {
          setGuest(data.guests[0]);
          setError(null);
        } else {
          setGuest(null);
          setError("Guest not found");
        }
      }
    } catch {
      setError("Search failed");
    } finally {
      setSearching(false);
    }
  };

  const uploadFile = async (file: File, guestId: string): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("guestId", guestId);
    const res = await fetch("/api/documents/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Upload failed");
    }
    const data = await res.json();
    return data.url as string;
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!guest) { setError("Please find a guest first"); return; }
    if (!frontFile) { setError("Front image is required"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const frontUrl = await uploadFile(frontFile, guest.id);
      const backUrl = backFile ? await uploadFile(backFile, guest.id) : undefined;

      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, documentType, frontUrl, backUrl }),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error ?? "Failed to save document");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Upload Guest Document</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Guest Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Find Guest
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), searchGuest())}
                placeholder="Name or phone number"
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
              />
              <button
                type="button"
                onClick={searchGuest}
                disabled={searching}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </div>
            {guest && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">{guest.name}</p>
                  <p className="text-xs text-green-600">{guest.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setGuest(null)}
                  className="ml-auto text-green-400 hover:text-green-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Document Type
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-[#E17055] focus:border-transparent"
            >
              {Object.entries(DOC_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Front Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Front Side <span className="text-red-500">*</span>
            </label>
            <input
              ref={frontInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "front")}
            />
            {frontPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={frontPreview} alt="Front preview" className="w-full max-h-48 object-contain bg-gray-50" />
                <button
                  type="button"
                  onClick={() => { setFrontFile(null); setFrontPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (frontInputRef.current) {
                      frontInputRef.current.removeAttribute("capture");
                      frontInputRef.current.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-[#E17055] hover:text-[#E17055]"
                >
                  <Upload className="h-5 w-5" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (frontInputRef.current) {
                      frontInputRef.current.setAttribute("capture", "environment");
                      frontInputRef.current.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-[#E17055] hover:text-[#E17055]"
                >
                  <Camera className="h-5 w-5" />
                  Take Photo
                </button>
              </div>
            )}
          </div>

          {/* Back Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Back Side <span className="text-gray-400">(Optional)</span>
            </label>
            <input
              ref={backInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], "back")}
            />
            {backPreview ? (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={backPreview} alt="Back preview" className="w-full max-h-48 object-contain bg-gray-50" />
                <button
                  type="button"
                  onClick={() => { setBackFile(null); setBackPreview(null); }}
                  className="absolute top-2 right-2 rounded-full bg-red-500 p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (backInputRef.current) {
                      backInputRef.current.removeAttribute("capture");
                      backInputRef.current.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-[#E17055] hover:text-[#E17055]"
                >
                  <Upload className="h-5 w-5" />
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (backInputRef.current) {
                      backInputRef.current.setAttribute("capture", "environment");
                      backInputRef.current.click();
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-4 text-sm text-gray-500 hover:border-[#E17055] hover:text-[#E17055]"
                >
                  <Camera className="h-5 w-5" />
                  Take Photo
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !guest || !frontFile}
              className="flex-1 rounded-lg bg-[#E17055] py-3 text-sm font-medium text-white hover:bg-[#D35B3F] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? "Uploading..." : "Save Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
