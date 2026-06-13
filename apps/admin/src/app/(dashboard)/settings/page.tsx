"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle, useToast } from "@the-rooms/ui";
import { Building2, Bell, Shield, Loader2 } from "lucide-react";

interface HotelSettings {
  hotelName: string;
  address: string;
  phone: string;
  email: string;
  extraGuestRateDaily: string;
  emailOnBooking: boolean;
  emailOnCancel: boolean;
  dailyReport: boolean;
  maintenanceAlerts: boolean;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submittingProperty, setSubmittingProperty] = useState(false);
  const [submittingSecurity, setSubmittingSecurity] = useState(false);

  const [settings, setSettings] = useState<HotelSettings>({
    hotelName: "",
    address: "",
    phone: "",
    email: "",
    extraGuestRateDaily: "500",
    emailOnBooking: true,
    emailOnCancel: true,
    dailyReport: true,
    maintenanceAlerts: true,
  });

  const [security, setSecurity] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.settings) {
            setSettings({
              hotelName: data.settings.hotelName || "",
              address: data.settings.address || "",
              phone: data.settings.phone || "",
              email: data.settings.email || "",
              extraGuestRateDaily: data.settings.extraGuestRateDaily != null ? String(data.settings.extraGuestRateDaily) : "500",
              emailOnBooking: data.settings.emailOnBooking ?? true,
              emailOnCancel: data.settings.emailOnCancel ?? true,
              dailyReport: data.settings.dailyReport ?? true,
              maintenanceAlerts: data.settings.maintenanceAlerts ?? true,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handlePropertySave = async () => {
    setSubmittingProperty(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hotelName: settings.hotelName,
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          extraGuestRateDaily: parseFloat(settings.extraGuestRateDaily) || 500,
        }),
      });
      if (!res.ok) throw new Error("Failed to save property info");
      toast({ type: "success", title: "Saved", message: "Property information saved." });
    } catch (err) {
      toast({ type: "error", title: "Error", message: "Failed to save property information." });
    } finally {
      setSubmittingProperty(false);
    }
  };

  const handleTogglePref = async (key: keyof HotelSettings) => {
    const newValue = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newValue }));
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: newValue }),
      });
      if (!res.ok) {
        setSettings((prev) => ({ ...prev, [key]: !newValue })); // revert on error
        toast({ type: "error", title: "Error", message: "Failed to update preference." });
      }
    } catch (err) {
      setSettings((prev) => ({ ...prev, [key]: !newValue }));
      toast({ type: "error", title: "Error", message: "Failed to update preference." });
    }
  };

  const handleSecuritySave = async () => {
    setSubmittingSecurity(true);
    try {
      const res = await fetch("/api/settings/security", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(security),
      });
      if (!res.ok) throw new Error("Failed to update security");
      toast({ type: "success", title: "Saved", message: "Security settings updated." });
      setSecurity({ email: "", password: "" }); // clear password field
    } catch (err) {
      toast({ type: "error", title: "Error", message: "Failed to update security settings." });
    } finally {
      setSubmittingSecurity(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Property-wide configuration and portal settings"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Property Info */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Property Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Hotel Name</label>
              <input
                type="text"
                value={settings.hotelName}
                onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px]"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Phone</label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Extra Guest Charge (₹ per guest per night)</label>
              <p className="text-xs text-muted-foreground">Applies for DAILY bookings with more than 2 guests</p>
              <input
                type="number"
                min="0"
                step="50"
                value={settings.extraGuestRateDaily}
                onChange={(e) => setSettings({ ...settings, extraGuestRateDaily: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <button 
              onClick={handlePropertySave}
              disabled={submittingProperty}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {submittingProperty && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "emailOnBooking" as const, label: "Email on new booking", description: "Receive email when a booking is confirmed" },
              { key: "emailOnCancel" as const, label: "Email on cancellation", description: "Receive email when a booking is cancelled" },
              { key: "dailyReport" as const, label: "Daily EOD report", description: "Send daily end-of-day summary" },
              { key: "maintenanceAlerts" as const, label: "Maintenance alerts", description: "Alert when room status changes to maintenance" },
            ].map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 py-2">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={settings[item.key] as boolean} 
                  onChange={() => handleTogglePref(item.key)}
                  className="mt-1 accent-primary h-4 w-4" 
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">New Admin Email (Optional)</label>
                <input 
                  type="email" 
                  value={security.email}
                  onChange={(e) => setSecurity({ ...security, email: e.target.value })}
                  placeholder="admin@therooms.in" 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Change Password (Optional)</label>
                <input 
                  type="password" 
                  value={security.password}
                  onChange={(e) => setSecurity({ ...security, password: e.target.value })}
                  placeholder="••••••••" 
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" 
                />
              </div>
            </div>
            <button 
              onClick={handleSecuritySave}
              disabled={submittingSecurity || (!security.email && !security.password)}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {submittingSecurity && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Security Settings
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
