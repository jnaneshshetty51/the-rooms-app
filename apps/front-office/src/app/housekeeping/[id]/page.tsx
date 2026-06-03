"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, Trash2, Clock, Sparkles, AlertCircle, Upload, FileText, CheckCircle } from "lucide-react";

export default function HousekeepingTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [maintenanceReported, setMaintenanceReported] = useState(false);

  useEffect(() => {
    async function fetchRoom() {
      try {
        const res = await fetch(`/api/housekeeping/rooms/${id}`);
        if (res.ok) setRoom(await res.json());
      } catch (e) {
        console.error("Failed", e);
      } finally {
        setLoading(false);
      }
    }
    fetchRoom();
  }, [id]);

  const updateStatus = async (cleaningStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/housekeeping/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaningStatus }),
      });
      if (res.ok) {
        setRoom({ ...room, cleaningStatus });
        if (cleaningStatus === "CLEAN") {
          setTimeout(() => router.push("/housekeeping"), 1000);
        }
      }
    } finally {
      setUpdating(false);
    }
  };

  const reportMaintenance = async () => {
    if (!confirm("Are you sure you want to mark this room as out of order for maintenance?")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/housekeeping/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "MAINTENANCE" }),
      });
      if (res.ok) {
        setRoom({ ...room, status: "MAINTENANCE" });
        setMaintenanceReported(true);
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!notes) return;
    setUpdating(true);
    try {
      await fetch(`/api/housekeeping/rooms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setNotes("");
      alert("Note saved successfully.");
    } finally {
      setUpdating(false);
    }
  };

  const mockUploadPhoto = () => {
    setUpdating(true);
    setTimeout(() => {
      setPhotoUploaded(true);
      setUpdating(false);
    }, 1500);
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;
  if (!room) return <div className="p-6 text-center">Room not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/housekeeping" className="p-2 -ml-2 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Room {room.roomNumber}</h1>
          <p className="text-sm text-gray-500">Floor {room.floor} • {room.type}</p>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Cleaning Status Selector */}
        <div className="bg-white rounded-xl border p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Update Status</h2>
          
          <div className="space-y-3">
            <button
              onClick={() => updateStatus("DIRTY")}
              disabled={updating || room.cleaningStatus === "DIRTY"}
              className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", 
                room.cleaningStatus === "DIRTY" ? "border-red-500 bg-red-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Trash2 className={cn("w-6 h-6", room.cleaningStatus === "DIRTY" ? "text-red-600" : "text-gray-400")} />
                <span className={cn("font-medium", room.cleaningStatus === "DIRTY" ? "text-red-900" : "text-gray-700")}>Dirty</span>
              </div>
              {room.cleaningStatus === "DIRTY" && <CheckCircle className="w-5 h-5 text-red-600" />}
            </button>

            <button
              onClick={() => updateStatus("CLEANING")}
              disabled={updating || room.cleaningStatus === "CLEANING"}
              className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", 
                room.cleaningStatus === "CLEANING" ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Clock className={cn("w-6 h-6", room.cleaningStatus === "CLEANING" ? "text-blue-600" : "text-gray-400")} />
                <span className={cn("font-medium", room.cleaningStatus === "CLEANING" ? "text-blue-900" : "text-gray-700")}>Cleaning in Progress</span>
              </div>
              {room.cleaningStatus === "CLEANING" && <CheckCircle className="w-5 h-5 text-blue-600" />}
            </button>

            <button
              onClick={() => updateStatus("CLEAN")}
              disabled={updating || room.cleaningStatus === "CLEAN"}
              className={cn("w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all", 
                room.cleaningStatus === "CLEAN" ? "border-green-500 bg-green-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Sparkles className={cn("w-6 h-6", room.cleaningStatus === "CLEAN" ? "text-green-600" : "text-gray-400")} />
                <span className={cn("font-medium", room.cleaningStatus === "CLEAN" ? "text-green-900" : "text-gray-700")}>Cleaned (Ready)</span>
              </div>
              {room.cleaningStatus === "CLEAN" && <CheckCircle className="w-5 h-5 text-green-600" />}
            </button>
          </div>
        </div>

        {/* Notes & Photos */}
        <div className="bg-white rounded-xl border p-4 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Task Details</h2>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-600 mb-2"><FileText className="w-4 h-4" /> Add Note</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Missing towels, found guest item..."
              className="w-full px-3 py-2 border rounded-lg resize-none focus:ring-2 focus:ring-gray-900"
              rows={3}
            />
            <button 
              onClick={handleSaveNotes}
              disabled={!notes || updating}
              className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              Save Note
            </button>
          </div>

          <div className="pt-2 border-t">
            <button
              onClick={mockUploadPhoto}
              disabled={photoUploaded || updating}
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              {photoUploaded ? <><CheckCircle className="w-5 h-5 text-green-600" /> <span className="text-green-700">Photo Uploaded</span></> : <><Upload className="w-5 h-5" /> Upload Room Photo</>}
            </button>
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-yellow-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900">Report Maintenance Issue</h3>
              <p className="text-sm text-gray-500 mt-1 mb-3">Is something broken or requires maintenance?</p>
              <button
                onClick={reportMaintenance}
                disabled={maintenanceReported || room.status === "MAINTENANCE" || updating}
                className="w-full py-2.5 bg-yellow-100 text-yellow-800 font-medium rounded-lg disabled:opacity-50"
              >
                {maintenanceReported || room.status === "MAINTENANCE" ? "Maintenance Reported" : "Mark for Maintenance"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
