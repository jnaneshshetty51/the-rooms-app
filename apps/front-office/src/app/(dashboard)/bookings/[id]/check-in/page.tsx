/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { cn } from "@the-rooms/ui";
import { Loader2, ArrowLeft, User, Calendar, CheckCircle, AlertCircle, Camera } from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface Booking { id: string; bookingNumber: string; status: string; paymentStatus: string; checkIn: string; checkOut: string; guest: { id: string; name: string; phone: string; email?: string }; room: { roomNumber: string; type: string } }
const STEPS = [{ id: 1, name: "Verify", icon: Calendar }, { id: 2, name: "Guest", icon: User }, { id: 3, name: "Documents", icon: User }, { id: 4, name: "Complete", icon: CheckCircle }];

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState("AADHAAR");
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBooking() {
      try { const res = await fetch(`/api/bookings/${id}`); if (!res.ok) throw new Error("Not found"); const data = await res.json(); if (data.status !== "CONFIRMED") setError("Cannot check in: " + data.status); setBooking(data); }
      catch (err) { setError(err instanceof Error ? err.message : "Unknown"); }
      finally { setLoading(false); }
    }
    fetchBooking();
  }, [id]);

  const handleCheckIn = async () => {
    try { const res = await fetch(`/api/bookings/${id}/check-in`, { method: "POST" }); if (!res.ok) throw new Error("Failed"); setStep(4); }
    catch { alert("Check-in failed"); }
  };

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#E17055]" /></div>;
  if (error && !booking) return <div className="flex h-[60vh] items-center justify-center"><div className="text-center"><AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-gray-900 font-medium">{error}</p><Link href="/bookings" className="mt-4 text-[#E17055]">Back</Link></div></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4"><Link href={`/bookings/${id}`} className="rounded-lg border border-gray-300 p-2 hover:bg-gray-50"><ArrowLeft className="h-5 w-5" /></Link><div><h2 className="text-2xl font-bold text-gray-900">Check-In</h2><p className="text-gray-500">Booking #{booking?.bookingNumber} • Room {booking?.room.roomNumber}</p></div></div>
      {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700">{error}</div>}
      <div className="flex items-center justify-between overflow-x-auto pb-2">{STEPS.map((s, i) => <div key={s.id} className="flex items-center"><button disabled={step < s.id} className={cn("flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium whitespace-nowrap", step === s.id ? "bg-[#E17055] text-white" : step > s.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400")}><s.icon className="h-4 w-4" />{s.name}</button>{i < STEPS.length - 1 && <div className={cn("h-0.5 w-8 mx-1", step > s.id ? "bg-green-400" : "bg-gray-200")} />}</div>)}</div>

      {step === 1 && booking && <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6"><h3 className="text-lg font-semibold text-gray-900">Verify Booking</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-4"><div><p className="text-sm text-gray-500">Guest</p><p className="font-medium text-lg">{booking.guest.name}</p></div><div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{booking.guest.phone}</p></div></div><div className="space-y-4"><div><p className="text-sm text-gray-500">Check-in</p><p className="font-medium">{formatDate(booking.checkIn, "long")}</p></div><div><p className="text-sm text-gray-500">Check-out</p><p className="font-medium">{formatDate(booking.checkOut, "long")}</p></div><div><p className="text-sm text-gray-500">Room</p><p className="font-medium">{booking.room.roomNumber} ({booking.room.type})</p></div></div></div><button onClick={() => setStep(2)} className="w-full rounded-lg bg-[#E17055] py-3 text-white hover:bg-[#D35B3F]">Confirm & Continue</button></div>}

      {step === 2 && booking && <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6"><h3 className="text-lg font-semibold text-gray-900">Confirm Guest</h3><div className="p-4 bg-gray-50 rounded-lg flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#E17055] flex items-center justify-center"><span className="text-white font-bold text-lg">{booking.guest.name.charAt(0)}</span></div><div><p className="font-medium">{booking.guest.name}</p><p className="text-sm text-gray-500">{booking.guest.phone}</p></div></div><p className="text-sm text-gray-600">Is this correct?</p><div className="flex gap-3"><button onClick={() => setStep(1)} className="flex-1 border border-gray-300 py-3 text-gray-700 hover:bg-gray-50">Back</button><button onClick={() => setStep(3)} className="flex-1 bg-[#E17055] py-3 text-white hover:bg-[#D35B3F]">Continue</button></div></div>}

      {step === 3 && <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-6"><h3 className="text-lg font-semibold text-gray-900">Document Collection</h3><div><label className="block text-sm font-medium mb-2">Document Type</label><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{["AADHAAR", "PASSPORT", "VOTER_ID", "DRIVING_LICENSE"].map((type) => <button key={type} onClick={() => setDocumentType(type)} className={cn("rounded-lg border-2 py-3 text-sm font-medium", documentType === type ? "border-[#E17055] bg-[#E17055]/5 text-[#E17055]" : "border-gray-200 text-gray-600")}>{type.replace("_", " ")}</button>)}</div></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium mb-2">Front *</label><div className={cn("relative rounded-lg border-2 border-dashed p-6 text-center", frontImage ? "border-green-400 bg-green-50" : "border-gray-300")}>{frontImage ? <><img src={frontImage} alt="Front" className="mx-auto max-h-40 rounded" /><button onClick={() => setFrontImage(null)} className="mt-2 text-sm text-red-600">Remove</button></> : <><Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Tap to capture</p></>}</div></div><div><label className="block text-sm font-medium mb-2">Back *</label><div className={cn("relative rounded-lg border-2 border-dashed p-6 text-center", backImage ? "border-green-400 bg-green-50" : "border-gray-300")}>{backImage ? <><img src={backImage} alt="Back" className="mx-auto max-h-40 rounded" /><button onClick={() => setBackImage(null)} className="mt-2 text-sm text-red-600">Remove</button></> : <><Camera className="h-12 w-12 text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600">Tap to capture</p></>}</div></div></div><div className="flex gap-3"><button onClick={() => setStep(2)} className="flex-1 border border-gray-300 py-3 text-gray-700 hover:bg-gray-50">Back</button><button onClick={() => setStep(4)} disabled={!frontImage || !backImage} className="flex-1 bg-[#E17055] py-3 text-white hover:bg-[#D35B3F] disabled:opacity-50">Continue</button></div></div>}

      {step === 4 && booking && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center space-y-6"><div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto"><CheckCircle className="h-10 w-10 text-green-600" /></div><div><h3 className="text-2xl font-bold">Check-In Complete!</h3><p className="text-gray-500 mt-2">{booking.guest.name} checked into Room {booking.room.roomNumber}</p></div><div className="space-y-2 text-left bg-gray-50 rounded-lg p-4"><div className="flex justify-between"><span className="text-gray-500">Check-out</span><span className="font-medium">{formatDate(booking.checkOut, "long")}</span></div><div className="flex justify-between"><span className="text-gray-500">Room</span><span className="font-medium">{booking.room.roomNumber}</span></div></div><div className="flex gap-3"><Link href="/dashboard" className="flex-1 border border-gray-300 py-3 text-gray-700 hover:bg-gray-50">Dashboard</Link><Link href={`/bookings/${id}`} className="flex-1 bg-[#E17055] py-3 text-white hover:bg-[#D35B3F]">View Booking</Link></div></div>}
    </div>
  );
}
