"use client";

import { useState } from "react";
import { FileSearch } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "../../lib/utils";

interface DocumentPreviewProps {
  src?: string;
  alt?: string;
  label?: string;
  className?: string;
}

export function DocumentPreview({ src, alt = "Document", label, className }: DocumentPreviewProps) {
  const [open, setOpen] = useState(false);

  if (!src) {
    return (
      <div
        className={cn(
          "flex h-24 w-36 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border bg-accent/30 hover:bg-accent/50 transition-colors",
          className
        )}
      >
        <div className="text-center">
          <FileSearch className="mx-auto h-6 w-6 text-muted-foreground" />
          {label && <p className="mt-1 text-xs text-muted-foreground">{label}</p>}
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "relative h-24 w-36 cursor-pointer overflow-hidden rounded-lg border border-border bg-accent/30 hover:bg-accent/50 transition-colors group",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <img src={src} alt={alt} className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
          <FileSearch className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{alt}</DialogTitle>
            <DialogDescription>{label}</DialogDescription>
          </DialogHeader>
          <img
            src={src}
            alt={alt}
            className="w-full max-h-[70vh] object-contain rounded-md"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
