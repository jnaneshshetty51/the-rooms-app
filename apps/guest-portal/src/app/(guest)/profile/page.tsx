"use client";

import { useEffect, useState, Suspense } from "react";
import { User, Mail, Phone, MapPin, Building, Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@the-rooms/ui";

type Profile = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  alternatePhone: string | null;
  address: string | null;
  companyName: string | null;
};

function ProfilePageContent() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [address, setAddress] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
            setName(data.profile.name || "");
            setPhone(data.profile.phone || "");
            setAlternatePhone(data.profile.alternatePhone || "");
            setAddress(data.profile.address || "");
            setCompanyName(data.profile.companyName || "");
          }
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          alternatePhone,
          address,
          companyName,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      setSuccess("Profile updated successfully!");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
        <p className="text-[#636E72] font-medium">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">My Profile</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Manage your personal information
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b border-[#E5E5E5] mb-4">
          <CardTitle className="text-lg">Contact Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#636E72]" /> Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                />
              </div>

              {/* Email (Disabled) */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#636E72]" /> Email Address
                </label>
                <input
                  type="email"
                  value={profile.email || ""}
                  disabled
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-gray-50 text-[#636E72] text-sm cursor-not-allowed"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#636E72]" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                />
              </div>

              {/* Alternate Phone */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#636E72]" /> Alternate Phone
                </label>
                <input
                  type="tel"
                  value={alternatePhone}
                  onChange={(e) => setAlternatePhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                />
              </div>

              {/* Company */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <Building className="w-4 h-4 text-[#636E72]" /> Company Name
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                />
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#636E72]" /> Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2 mt-4">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-start gap-2 mt-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                {success}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#E17055] hover:bg-[#D35B3F] px-6"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E17055] border-t-transparent" /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
