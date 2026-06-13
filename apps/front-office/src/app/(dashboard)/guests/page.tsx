"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Search, Loader2, User, Phone, Mail, Calendar } from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface Guest { id: string; name: string; phone: string; email?: string; companyName?: string; stayCount: number; loyaltyTier: string; bookings?: Array<{ id: string; checkIn: string; checkOut: string; status: string; room?: { roomNumber: string; type: string } | null }> }

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGuests = useCallback(async (query: string) => {
    if (query.length < 2) { setGuests([]); setSearched(false); setError(null); return; }
    setLoading(true); setSearched(true); setError(null);
    try {
      const res = await fetch(`/api/guests/search?q=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Search failed"); setGuests([]); }
      else { setGuests(data.guests ?? []); }
    }
    catch (e) { setError("Network error"); setGuests([]); }
    finally { setLoading(false); }
  }, []);

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Guest Search</h2><p className="text-gray-500">Search by name, phone, or email</p></div>
      <div className="rounded-xl border bg-white p-6"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setTimeout(() => searchGuests(e.target.value), 300); }} placeholder="Search..." className="w-full pl-12 pr-4 py-4 rounded-lg border text-lg" />{loading && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-gray-400" />}</div></div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {!loading && searched && guests.length === 0 && !error && <div className="rounded-xl border bg-white py-12 text-center"><User className="h-12 w-12 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">No guests found</p></div>}
      {!loading && guests.length > 0 && <div className="space-y-4"><p className="text-sm text-gray-500">{guests.length} guest{guests.length !== 1 ? "s" : ""} found</p>{guests.map((guest) => (
        <div key={guest.id} className="rounded-xl border bg-white hover:shadow-md transition-shadow">
          <div className="p-6"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-[#E17055] flex items-center justify-center"><span className="text-white font-bold text-lg">{guest.name.charAt(0)}</span></div><div><div className="flex items-center gap-2"><h3 className="text-lg font-semibold">{guest.name}</h3><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-700">{guest.loyaltyTier}</span></div><div className="flex items-center gap-4 mt-1 text-sm text-gray-500"><span className="flex items-center gap-1"><Phone className="h-4 w-4" />{guest.phone}</span>{guest.email && <span className="flex items-center gap-1"><Mail className="h-4 w-4" />{guest.email}</span>}</div></div><div className="text-right"><p className="text-2xl font-bold text-[#E17055]">{guest.stayCount}</p><p className="text-xs text-gray-500">stays</p></div></div>{(guest.bookings?.length ?? 0) > 0 && <div className="mt-4 pt-4 border-t flex gap-2 overflow-x-auto">{guest.bookings!.slice(0, 3).map((b) => <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm whitespace-nowrap hover:bg-gray-100"><Calendar className="h-4 w-4 text-gray-400" /><span className="font-medium">Room {b.room?.roomNumber ?? "?"}</span><span className="text-gray-400">{formatDate(b.checkIn, "short")}</span></Link>)}</div>}</div></div>
          <div className="border-t px-6 py-3 flex gap-3"><Link href={`/guests/${guest.id}`} className="flex items-center gap-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">View Profile</Link><Link href={`/bookings/new?guest=${guest.id}`} className="flex items-center gap-1 rounded-lg bg-[#E17055] px-4 py-2 text-sm font-medium text-white hover:bg-[#D35B3F]">New Booking</Link></div>
        </div>
      ))}</div>}
    </div>
  );
}
