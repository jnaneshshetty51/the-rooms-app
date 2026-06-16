"use client";

// apps/admin/src/app/(dashboard)/notifications/page.tsx
import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Mail, MessageSquare, Bell, Eye, EyeOff } from "lucide-react";
import {
  PageHeader,
  Button,
  Card,
  CardContent,
  Badge,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  StatCard,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";
import {
  fetchNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  type NotificationTemplate,
} from "@/lib/api";

export default function NotificationsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "EMAIL" as "EMAIL" | "SMS" | "PUSH",
    subject: "",
    content: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await fetchNotificationTemplates();
      setTemplates(result.templates || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    const data = {
      ...formData,
      variables: extractVariables(formData.content),
    };

    if (editingTemplate) {
      await updateNotificationTemplate(editingTemplate.id, data);
    } else {
      await createNotificationTemplate(data);
    }
    setShowModal(false);
    setEditingTemplate(null);
    setFormData({ name: "", type: "EMAIL", subject: "", content: "" });
    fetchData();
  };

  const handleEdit = (template: NotificationTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      subject: template.subject ?? "",
      content: template.content,
    });
    setShowModal(true);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, "")))];
  };

  const stats = {
    total: templates.length,
    email: templates.filter((t) => t.type === "EMAIL").length,
    sms: templates.filter((t) => t.type === "SMS").length,
    push: templates.filter((t) => t.type === "PUSH").length,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "EMAIL":
        return Mail;
      case "SMS":
        return MessageSquare;
      case "PUSH":
        return Bell;
      default:
        return Bell;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Manage email, SMS and push notification templates"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Templates" value={stats.total} icon={Bell} />
        <StatCard label="Email" value={stats.email} icon={Mail} />
        <StatCard label="SMS" value={stats.sms} icon={MessageSquare} />
        <StatCard label="Push" value={stats.push} icon={Bell} />
      </div>

      {/* Templates List */}
      <div className="grid gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notification templates configured</p>
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => {
            const Icon = getIcon(template.type);
            return (
              <Card key={template.id} className={!template.isActive ? "opacity-60" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-secondary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{template.name}</h3>
                          <Badge variant={template.isActive ? "success" : "secondary"}>
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <Badge variant="outline">{template.type}</Badge>
                        </div>
                        {template.subject && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Subject: {template.subject}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {template.content.slice(0, 150)}...
                        </p>
                        {template.variables.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {template.variables.map((v) => (
                              <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {`{{${v}}}`}
                              </code>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewContent(template.content)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Create Notification Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Booking Confirmation, Check-in Reminder"
              />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData((f) => ({ ...f, type: v as "EMAIL" | "SMS" | "PUSH" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="PUSH">Push Notification</option>
                </SelectContent>
              </Select>
            </div>
            {formData.type === "EMAIL" && (
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Enter email subject"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Message Content</Label>
              <textarea
                className="w-full h-40 p-3 border rounded-lg text-sm"
                value={formData.content}
                onChange={(e) => setFormData((f) => ({ ...f, content: e.target.value }))}
                placeholder="Enter message content. Use {'{{variableName}}'} for dynamic content."
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{guestName}}"}, {"{{bookingNumber}}"}, {"{{checkInDate}}"}, {"{{checkOutDate}}"}, {"{{roomNumber}}"}, {"{{totalAmount}}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTemplate ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!previewContent} onOpenChange={() => setPreviewContent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Preview</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm whitespace-pre-wrap">{previewContent}</pre>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewContent(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
