"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, FileText, CheckCircle2, Clock, AlertCircle, Loader2, X, Eye } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

type Document = {
  id: string;
  documentType: string;
  frontUrl: string;
  backUrl?: string;
  verified: boolean;
  uploadedAt: string;
  booking?: {
    bookingNumber: string;
    room: { roomNumber: string };
  };
};

type Booking = {
  id: string;
  bookingNumber: string;
  room: { roomNumber: string };
};

const DOCUMENT_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "VOTER_ID", label: "Voter ID" },
  { value: "DRIVING_LICENSE", label: "Driving License" },
];

export default function DocumentsPage() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [documents, setDocuments] = useState<Document[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    bookingId: preselectedBookingId ?? "",
    documentType: "AADHAAR",
    frontUrl: "",
    backUrl: "",
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [docsRes, bookingsRes] = await Promise.all([
          fetch("/api/documents"),
          fetch("/api/bookings"),
        ]);
        if (docsRes.ok) {
          const data = await docsRes.json();
          setDocuments(data.documents ?? []);
        }
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setBookings(data.bookings ?? []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  async function handleFileSelect(
    side: "front" | "back",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    // For now, create a local object URL — in production, upload to MinIO
    const url = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      [side === "front" ? "frontUrl" : "backUrl"]: url,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.bookingId || !formData.frontUrl) {
      setError("Please select a booking and upload the front of your ID");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      // In production: upload file to MinIO, get signed URL, then submit
      // For now, we use the local object URL as a placeholder
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Upload failed");
      }

      const data = await res.json();
      setDocuments((prev) => [data.document, ...prev]);
      setSuccess("Document uploaded successfully! Our team will verify it shortly.");
      setFormData((prev) => ({
        ...prev,
        frontUrl: "",
        backUrl: "",
      }));
    } catch (err: any) {
      setError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
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
        <h1 className="text-2xl font-bold text-[#2D3436]">Documents</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Upload your ID proof for a smooth check-in experience
        </p>
      </div>

      {/* Upload form */}
      <Card className="border-[#E17055]/30">
        <div className="h-1 bg-gradient-to-r from-[#E17055] to-[#FDCB6E]" />
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#E17055]" />
            Upload ID Document
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Booking selector */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Select Booking
              </label>
              <Select
                value={formData.bookingId}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, bookingId: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a booking" />
                </SelectTrigger>
                <SelectContent>
                  {bookings
                    .filter((b) =>
                      ["CONFIRMED", "CHECKED_IN"].includes(b.status ?? "")
                    )
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.bookingNumber} — Room {b.room.roomNumber}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Document type */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Document Type
              </label>
              <Select
                value={formData.documentType}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, documentType: v }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((dt) => (
                    <SelectItem key={dt.value} value={dt.value}>
                      {dt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Front upload */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Front of ID <span className="text-red-500">*</span>
              </label>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect("front", e)}
              />
              <button
                type="button"
                onClick={() => frontInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#E5E5E5] rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[#E17055] transition-colors cursor-pointer"
              >
                {formData.frontUrl ? (
                  <div className="flex items-center gap-3 w-full">
                    <img
                      src={formData.frontUrl}
                      alt="Front"
                      className="w-20 h-14 object-cover rounded border"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#2D3436]">Front uploaded</p>
                      <p className="text-xs text-[#636E72]">Click to change</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((p) => ({ ...p, frontUrl: "" }));
                      }}
                      className="ml-auto"
                    >
                      <X className="w-4 h-4 text-[#636E72]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#B2BEC3]" />
                    <p className="text-sm text-[#636E72]">
                      Tap to upload front of ID
                    </p>
                    <p className="text-xs text-[#B2BEC3]">
                      JPEG, PNG, WEBP — max 10MB
                    </p>
                  </>
                )}
              </button>
            </div>

            {/* Back upload */}
            <div>
              <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                Back of ID <span className="text-xs text-[#B2BEC3]">(optional)</span>
              </label>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect("back", e)}
              />
              <button
                type="button"
                onClick={() => backInputRef.current?.click()}
                className="w-full border-2 border-dashed border-[#E5E5E5] rounded-lg p-6 flex flex-col items-center gap-2 hover:border-[#E17055] transition-colors cursor-pointer"
              >
                {formData.backUrl ? (
                  <div className="flex items-center gap-3 w-full">
                    <img
                      src={formData.backUrl}
                      alt="Back"
                      className="w-20 h-14 object-cover rounded border"
                    />
                    <div className="text-left">
                      <p className="text-sm font-medium text-[#2D3436]">Back uploaded</p>
                      <p className="text-xs text-[#636E72]">Click to change</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData((p) => ({ ...p, backUrl: "" }));
                      }}
                      className="ml-auto"
                    >
                      <X className="w-4 h-4 text-[#636E72]" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#B2BEC3]" />
                    <p className="text-sm text-[#636E72]">
                      Tap to upload back of ID
                    </p>
                    <p className="text-xs text-[#B2BEC3]">
                      JPEG, PNG, WEBP — max 10MB
                    </p>
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={uploading || !formData.frontUrl}
              className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" /> Upload Document</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Document list */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3436] mb-3">
          Uploaded Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <Card className="border-dashed border-2 border-[#E5E5E5]">
            <CardContent className="py-10 text-center">
              <FileText className="w-10 h-10 text-[#B2BEC3] mx-auto mb-3" />
              <p className="text-[#636E72] text-sm">No documents uploaded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#F0F0F0] flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-[#636E72]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#2D3436]">
                      {DOCUMENT_TYPES.find((t) => t.value === doc.documentType)?.label ??
                        doc.documentType}
                    </p>
                    <p className="text-xs text-[#636E72]">
                      Uploaded {formatDate(doc.uploadedAt)}
                      {doc.booking && ` · ${doc.booking.bookingNumber}`}
                    </p>
                  </div>
                  <Badge
                    variant={doc.verified ? "default" : "secondary"}
                    className={doc.verified ? "bg-[#00B894] text-white" : ""}
                  >
                    {doc.verified ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</>
                    ) : (
                      <><Clock className="w-3 h-3 mr-1" /> Pending</>
                    )}
                  </Badge>
                  {doc.frontUrl && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <img
                          src={doc.frontUrl}
                          alt="Document front"
                          className="w-full rounded-lg"
                        />
                        {doc.backUrl && (
                          <img
                            src={doc.backUrl}
                            alt="Document back"
                            className="w-full rounded-lg mt-2"
                          />
                        )}
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
