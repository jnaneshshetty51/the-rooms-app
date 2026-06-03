"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
  Badge,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@the-rooms/ui";
import {
  Building2,
  Mail,
  CreditCard,
  HardDrive,
  Shield,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@the-rooms/ui";

export default function SettingsPage() {
  const toast = useToast();
  const [showIndusInd, setShowIndusInd] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [showMinio, setShowMinio] = useState(false);

  const [settings, setSettings] = useState({
    hotelName: "The Rooms",
    hotelAddress: "MG Road, Near City Center, New Delhi, India",
    hotelPhone: "+91 11 2345 6789",
    hotelEmail: "hello@therooms.in",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    lateCheckOutFee: "500",
    earlyCheckInFee: "500",
    gstNumber: "07AAACH1234P1Z5",
    bankName: "HDFC Bank",
    accountNumber: "501XXXXXXX1234",
    ifscCode: "HDFC0001234",
    cancellationPolicy: "Free cancellation up to 24 hours before check-in. After that, first night charge applies.",
  });

  const [configs, setConfigs] = useState({
    indusindClientId: "INDUSIND_CLIENT_XXXX",
    indusindClientSecret: "INDUSIND_SECRET_XXXX",
    indusindMerchantId: "MERCHANT_12345",
    indusindWebhookUrl: "https://api.therooms.in/api/payments/indusind/webhook",
    indusindMode: "production",
    resendApiKey: "re_XXXX_XXXX",
    resendFromEmail: "hello@therooms.in",
    resendDomainVerified: true,
    minioEndpoint: "minio.therooms.in:9000",
    minioAccessKey: "MINIO_ACCESS_KEY",
    minioSecretKey: "MINIO_SECRET_KEY",
    minioBucket: "therooms-storage",
  });

  function handleSave() {
    toast.success("Settings saved");
  }

  function mask(str: string) {
    if (str.length <= 4) return "****";
    return "****" + str.slice(-4);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Settings"
        description="Global configuration, credentials, and system preferences"
      />

      <Tabs defaultValue="hotel" className="space-y-6">
        <TabsList>
          <TabsTrigger value="hotel">Hotel Info</TabsTrigger>
          <TabsTrigger value="payments">Payment (INDUSIND)</TabsTrigger>
          <TabsTrigger value="email">Email (Resend)</TabsTrigger>
          <TabsTrigger value="storage">Storage (MinIO)</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Hotel Info */}
        <TabsContent value="hotel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#E17055]" />
                Hotel Information
              </CardTitle>
              <CardDescription>
                This information appears on invoices, emails, and the public website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Hotel Name</Label>
                  <Input
                    value={settings.hotelName}
                    onChange={(e) => setSettings((s) => ({ ...s, hotelName: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>GST Number</Label>
                  <Input
                    value={settings.gstNumber}
                    onChange={(e) => setSettings((s) => ({ ...s, gstNumber: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={settings.hotelAddress}
                    onChange={(e) => setSettings((s) => ({ ...s, hotelAddress: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={settings.hotelPhone}
                    onChange={(e) => setSettings((s) => ({ ...s, hotelPhone: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={settings.hotelEmail}
                    onChange={(e) => setSettings((s) => ({ ...s, hotelEmail: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Check-in Time</Label>
                  <Input
                    type="time"
                    value={settings.checkInTime}
                    onChange={(e) => setSettings((s) => ({ ...s, checkInTime: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Check-out Time</Label>
                  <Input
                    type="time"
                    value={settings.checkOutTime}
                    onChange={(e) => setSettings((s) => ({ ...s, checkOutTime: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Late Check-out Fee (₹/hour)</Label>
                  <Input
                    type="number"
                    value={settings.lateCheckOutFee}
                    onChange={(e) => setSettings((s) => ({ ...s, lateCheckOutFee: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Early Check-in Fee (₹/hour)</Label>
                  <Input
                    type="number"
                    value={settings.earlyCheckInFee}
                    onChange={(e) => setSettings((s) => ({ ...s, earlyCheckInFee: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Cancellation Policy</Label>
                  <textarea
                    value={settings.cancellationPolicy}
                    onChange={(e) => setSettings((s) => ({ ...s, cancellationPolicy: e.target.value }))}
                    className="mt-1 w-full border border-input bg-white rounded-lg px-3 py-2 text-sm min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#E17055]" />
                INDUSIND Payment Gateway
              </CardTitle>
              <CardDescription>
                Configure INDUSIND Bank credentials for payment processing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>INDUSIND Client ID</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showIndusInd ? "text" : "password"}
                      value={configs.indusindClientId}
                      onChange={(e) => setConfigs((c) => ({ ...c, indusindClientId: e.target.value }))}
                    />
                    <button
                      onClick={() => setShowIndusInd(!showIndusInd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showIndusInd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>INDUSIND Client Secret</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showIndusInd ? "text" : "password"}
                      value={configs.indusindClientSecret}
                      onChange={(e) => setConfigs((c) => ({ ...c, indusindClientSecret: e.target.value }))}
                    />
                    <button
                      onClick={() => setShowIndusInd(!showIndusInd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showIndusInd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Merchant ID</Label>
                  <Input
                    value={configs.indusindMerchantId}
                    onChange={(e) => setConfigs((c) => ({ ...c, indusindMerchantId: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Mode</Label>
                  <select
                    value={configs.indusindMode}
                    onChange={(e) => setConfigs((c) => ({ ...c, indusindMode: e.target.value }))}
                    className="mt-1 w-full border border-input bg-white rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="sandbox">Sandbox (Test)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label>Webhook URL (read-only)</Label>
                  <Input value={configs.indusindWebhookUrl} readOnly className="mt-1 bg-accent/50" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Configure this URL in your INDUSIND dashboard to receive payment notifications.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Test Connection
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#E17055]" />
                Resend Email Configuration
              </CardTitle>
              <CardDescription>
                Manage transactional email delivery via Resend API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 font-medium">
                    Domain verified — sending enabled
                  </span>
                </div>
                <Badge variant="success" className="text-xs">Active</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>API Key</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showResend ? "text" : "password"}
                      value={configs.resendApiKey}
                      onChange={(e) => setConfigs((c) => ({ ...c, resendApiKey: e.target.value }))}
                    />
                    <button
                      onClick={() => setShowResend(!showResend)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showResend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>From Address</Label>
                  <Input
                    type="email"
                    value={configs.resendFromEmail}
                    onChange={(e) => setConfigs((c) => ({ ...c, resendFromEmail: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1">
                  <Mail className="h-3 w-3" />
                  Send Test Email
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage */}
        <TabsContent value="storage">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-[#E17055]" />
                MinIO Storage Configuration
              </CardTitle>
              <CardDescription>
                S3-compatible object storage for room photos, guest documents, and invoices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label>Endpoint</Label>
                  <Input
                    value={configs.minioEndpoint}
                    onChange={(e) => setConfigs((c) => ({ ...c, minioEndpoint: e.target.value }))}
                    className="mt-1"
                    placeholder="minio.therooms.in:9000"
                  />
                </div>
                <div>
                  <Label>Access Key</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showMinio ? "text" : "password"}
                      value={configs.minioAccessKey}
                      onChange={(e) => setConfigs((c) => ({ ...c, minioAccessKey: e.target.value }))}
                    />
                    <button
                      onClick={() => setShowMinio(!showMinio)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMinio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Secret Key</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showMinio ? "text" : "password"}
                      value={configs.minioSecretKey}
                      onChange={(e) => setConfigs((c) => ({ ...c, minioSecretKey: e.target.value }))}
                    />
                    <button
                      onClick={() => setShowMinio(!showMinio)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showMinio ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <Label>Default Bucket</Label>
                  <Input
                    value={configs.minioBucket}
                    onChange={(e) => setConfigs((c) => ({ ...c, minioBucket: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Disk Usage</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">92 GB / 400 GB used</span>
                      <span className="text-xs font-semibold text-[#E17055]">23%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-[#E17055] rounded-full" style={{ width: "23%" }} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" className="gap-1">
                  <HardDrive className="h-3 w-3" />
                  Test Connection
                </Button>
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#E17055]" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {[
                  { label: "Require 2FA for Super Admin accounts", defaultChecked: true },
                  { label: "Auto-logout inactive sessions after 30 minutes", defaultChecked: true },
                  { label: "Send alert on failed login attempts", defaultChecked: true },
                  { label: "Enable IP allowlist for Super Admin", defaultChecked: false },
                  { label: "Auto-backup audit logs to offsite storage", defaultChecked: true },
                ].map((opt, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                    </div>
                    <Switch defaultChecked={opt.defaultChecked} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} className="gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
