"use client";

import { useEffect, useState, useRef } from "react";
import { Upload, Trash2, ImageIcon, Save, Plus, X } from "lucide-react";
import { Button, Input, Badge } from "@the-rooms/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@the-rooms/ui";
import { PageHeader } from "@the-rooms/ui";
import Image from "next/image";

interface RoomTypeImage {
  id: string;
  url: string;
  caption: string | null;
  sortOrder: number;
}

interface RoomTypeProfile {
  id: string;
  type: "STUDIO" | "PREMIUM";
  title: string;
  description: string | null;
  features: string[];
  images: RoomTypeImage[];
}

const TYPE_META = {
  STUDIO: { label: "Studio Rooms", color: "bg-blue-50 border-blue-200", badge: "bg-blue-100 text-blue-800" },
  PREMIUM: { label: "Premium Rooms", color: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-800" },
};

export default function RoomTypesPage() {
  const [profiles, setProfiles] = useState<Record<string, RoomTypeProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({ STUDIO: "", PREMIUM: "" });
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    fetch("/api/room-types")
      .then((r) => r.json())
      .then(({ profiles: list }) => {
        const map: Record<string, RoomTypeProfile> = {};
        if (list) list.forEach((p: RoomTypeProfile) => { map[p.type] = p; });

        // Ensure both types exist locally for editing
        for (const t of ["STUDIO", "PREMIUM"] as const) {
          if (!map[t]) {
            map[t] = {
              id: "",
              type: t,
              title: t === "STUDIO" ? "Studio Room" : "Premium Room",
              description: "",
              features: [],
              images: [],
            };
          }
        }
        setProfiles(map);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (type: "STUDIO" | "PREMIUM") => {
    const p = profiles[type];
    if (!p) return;
    setSaving(type);
    try {
      const res = await fetch("/api/room-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: p.title, description: p.description, features: p.features }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) => ({ ...prev, [type]: data.profile }));
      }
    } finally {
      setSaving(null);
    }
  };

  const handleUpload = async (type: "STUDIO" | "PREMIUM", file: File) => {
    setUploading(type);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/room-types/${type.toLowerCase()}/images`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setProfiles((prev) => ({
          ...prev,
          [type]: {
            ...prev[type],
            images: [...(prev[type]?.images ?? []), data.image],
          },
        }));
      }
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteImage = async (type: "STUDIO" | "PREMIUM", imageId: string) => {
    const res = await fetch(`/api/room-types/${type.toLowerCase()}/images?imageId=${imageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setProfiles((prev) => ({
        ...prev,
        [type]: {
          ...prev[type],
          images: prev[type].images.filter((img) => img.id !== imageId),
        },
      }));
    }
  };

  const addFeature = (type: "STUDIO" | "PREMIUM") => {
    const val = newFeature[type].trim();
    if (!val) return;
    setProfiles((prev) => ({
      ...prev,
      [type]: { ...prev[type], features: [...prev[type].features, val] },
    }));
    setNewFeature((prev) => ({ ...prev, [type]: "" }));
  };

  const removeFeature = (type: "STUDIO" | "PREMIUM", idx: number) => {
    setProfiles((prev) => ({
      ...prev,
      [type]: { ...prev[type], features: prev[type].features.filter((_, i) => i !== idx) },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading room types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Room Types"
        description="Manage images, descriptions, and features for Studio and Premium room types. All rooms of the same type share these images."
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {(["STUDIO", "PREMIUM"] as const).map((type) => {
          const profile = profiles[type];
          const meta = TYPE_META[type];
          if (!profile) return null;

          return (
            <Card key={type} className={`border-2 ${meta.color}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${meta.badge}`}>
                      {type}
                    </span>
                    {meta.label}
                  </CardTitle>
                  <Button
                    size="sm"
                    onClick={() => handleSave(type)}
                    disabled={saving === type}
                    className="gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving === type ? "Saving…" : "Save"}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Title & Description */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                      Display Title
                    </label>
                    <Input
                      value={profile.title}
                      onChange={(e) =>
                        setProfiles((prev) => ({
                          ...prev,
                          [type]: { ...prev[type], title: e.target.value },
                        }))
                      }
                      placeholder="e.g. Studio Room"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
                      Description
                    </label>
                    <textarea
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={3}
                      value={profile.description ?? ""}
                      onChange={(e) =>
                        setProfiles((prev) => ({
                          ...prev,
                          [type]: { ...prev[type], description: e.target.value },
                        }))
                      }
                      placeholder="Describe the room type for guests…"
                    />
                  </div>
                </div>

                {/* Features */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                    Features / Amenities
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {profile.features.map((f, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {f}
                        <button onClick={() => removeFeature(type, i)} className="hover:text-destructive ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newFeature[type]}
                      onChange={(e) => setNewFeature((prev) => ({ ...prev, [type]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && addFeature(type)}
                      placeholder="Add a feature (e.g. King Bed)"
                      className="text-sm"
                    />
                    <Button size="sm" variant="outline" onClick={() => addFeature(type)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Photos ({profile.images.length})
                    </label>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={(el) => { fileInputRefs.current[type] = el; }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUpload(type, file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploading === type}
                        onClick={() => fileInputRefs.current[type]?.click()}
                        className="gap-1"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {uploading === type ? "Uploading…" : "Upload Photo"}
                      </Button>
                    </div>
                  </div>

                  {profile.images.length === 0 ? (
                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRefs.current[type]?.click()}
                    >
                      <ImageIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No photos yet. Click to upload.
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        All {type === "STUDIO" ? "24 Studio" : "12 Premium"} rooms will display these images.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {profile.images.map((img) => (
                        <div key={img.id} className="relative group rounded-lg overflow-hidden aspect-video bg-muted">
                          <Image
                            src={img.url}
                            alt={img.caption ?? "Room photo"}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <button
                              onClick={() => handleDeleteImage(type, img.id)}
                              className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {img.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                              {img.caption}
                            </div>
                          )}
                        </div>
                      ))}
                      {/* Add more button */}
                      <div
                        className="border-2 border-dashed rounded-lg aspect-video flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => fileInputRefs.current[type]?.click()}
                      >
                        <div className="text-center">
                          <Plus className="w-5 h-5 mx-auto text-muted-foreground/40" />
                          <span className="text-xs text-muted-foreground/60">Add more</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
