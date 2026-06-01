"use client";

// apps/admin/src/app/(dashboard)/announcements/page.tsx
import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Megaphone, Calendar } from "lucide-react";
import { PageHeader, Button, Dialog, Input, Select, Badge, Card, CardContent } from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

interface Announcement {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  activeFrom: string;
  activeTo: string | null;
  priority: number;
  isActive: boolean;
  createdBy: { name: string | null } | null;
  createdAt: string;
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    body: "",
    imageUrl: "",
    linkUrl: "",
    linkLabel: "",
    activeFrom: "",
    activeTo: "",
    priority: "0",
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/announcements");
    const data = await res.json();
    setAnnouncements(data.announcements ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openEdit(a: Announcement) {
    setEditing(a);
    setForm({
      title: a.title,
      body: a.body,
      imageUrl: a.imageUrl ?? "",
      linkUrl: a.linkUrl ?? "",
      linkLabel: a.linkLabel ?? "",
      activeFrom: a.activeFrom.split("T")[0],
      activeTo: a.activeTo ? a.activeTo.split("T")[0] : "",
      priority: String(a.priority),
      isActive: a.isActive,
    });
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        priority: parseInt(form.priority),
        activeFrom: form.activeFrom,
        activeTo: form.activeTo || null,
        imageUrl: form.imageUrl || null,
        linkUrl: form.linkUrl || null,
        linkLabel: form.linkLabel || null,
      };
      if (editing) body.id = editing.id;

      const res = await fetch("/api/announcements", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowModal(false);
        setEditing(null);
        setForm({ title: "", body: "", imageUrl: "", linkUrl: "", linkLabel: "", activeFrom: "", activeTo: "", priority: "0", isActive: true });
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this announcement?")) return;
    await fetch(`/api/announcements?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleToggleActive(a: Announcement) {
    await fetch("/api/announcements", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: a.id, isActive: !a.isActive }),
    });
    fetchData();
  }

  const now = new Date();
  const active = announcements.filter((a) => a.isActive && new Date(a.activeFrom) <= now && (!a.activeTo || new Date(a.activeTo) >= now));
  const scheduled = announcements.filter((a) => new Date(a.activeFrom) > now);
  const expired = announcements.filter((a) => a.activeTo && new Date(a.activeTo) < now);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements & Banners"
        description="Manage on-site promotions and banner messages"
        actions={
          <Button onClick={() => {
            setEditing(null);
            setForm({ title: "", body: "", imageUrl: "", linkUrl: "", linkLabel: "", activeFrom: new Date().toISOString().split("T")[0], activeTo: "", priority: "0", isActive: true });
            setShowModal(true);
          }}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Announcement
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : (
        <div className="space-y-8">
          {[
            { label: "Active Now", items: active, color: "text-success" },
            { label: "Scheduled", items: scheduled, color: "text-warning" },
            { label: "Expired", items: expired, color: "text-muted-foreground" },
          ].map(({ label, items, color }) => items.length > 0 && (
            <div key={label}>
              <h2 className={`font-heading text-sm font-semibold uppercase tracking-wide mb-3 ${color}`}>{label} ({items.length})</h2>
              <div className="space-y-3">
                {items.map((a) => (
                  <Card key={a.id} className={`${!a.isActive ? "opacity-60" : ""} hover:shadow-sm transition-shadow`}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Megaphone className="h-4 w-4 text-primary shrink-0" />
                            <h3 className="font-semibold">{a.title}</h3>
                            <Badge variant="outline" className="text-xs">Priority {a.priority}</Badge>
                            {!a.isActive && <Badge variant="secondary" className="text-xs">Paused</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{a.body}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(a.activeFrom, "short")}{a.activeTo ? ` → ${formatDate(a.activeTo, "short")}` : " → Ongoing"}</span>
                            {a.linkUrl && <span className="underline">Link: {a.linkLabel ?? a.linkUrl}</span>}
                            {a.createdBy && <span>By {a.createdBy.name ?? "Admin"}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(a)}>
                            {a.isActive ? "⏸" : "▶"}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <Card><CardContent className="py-12 text-center"><Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No announcements yet.</p></CardContent></Card>
          )}
        </div>
      )}

      {showModal && (
        <Dialog open={showModal} onOpenChange={(v) => { setShowModal(v); if (!v) setEditing(null); }}>
          <div className="space-y-4">
            <h2 className="font-heading text-xl font-bold">{editing ? "Edit Announcement" : "New Announcement"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title *</label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale — 20% off!" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Message *</label>
                <textarea required className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[100px]" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Announcement text…" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Active From *</label>
                  <Input type="date" required value={form.activeFrom} onChange={(e) => setForm({ ...form, activeFrom: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Active To</label>
                  <Input type="date" value={form.activeTo} onChange={(e) => setForm({ ...form, activeTo: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority (higher = shows first)</label>
                  <Input type="number" min="0" max="100" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Image URL</label>
                  <Input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://…" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Link Label</label>
                  <Input value={form.linkLabel} onChange={(e) => setForm({ ...form, linkLabel: e.target.value })} placeholder="Book Now" />
                </div>
              </div>
              {form.linkLabel && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Link URL</label>
                  <Input value={form.linkUrl} onChange={(e) => setForm({ ...form, linkUrl: e.target.value })} placeholder="https://therooms.in/book" />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditing(null); }} className="flex-1">Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">{submitting ? "Saving…" : editing ? "Update" : "Publish"}</Button>
              </div>
            </form>
          </div>
        </Dialog>
      )}
    </div>
  );
}
