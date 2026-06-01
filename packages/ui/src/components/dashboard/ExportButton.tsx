"use client";

import { Download } from "lucide-react";
import { Button } from "../ui/button";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename?: string;
  label?: string;
  className?: string;
}

export function ExportButton({ data, filename = "export.csv", label = "Export CSV", className }: ExportButtonProps) {
  const handleExport = () => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map((row) =>
      Object.values(row)
        .map((v) => JSON.stringify(v ?? "").replace(/"/g, '""'))
        .join(",")
    );
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className={className}>
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}
