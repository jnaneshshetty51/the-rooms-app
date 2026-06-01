"use client";

import { Calendar, Filter } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { cn } from "../../lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
}

interface FilterBarProps {
  filters: {
    key: string;
    label: string;
    options: FilterOption[];
    value: string;
    onChange: (key: string, value: string) => void;
  }[];
  dateRange?: {
    start: string;
    end: string;
    onChange: (start: string, end: string) => void;
  };
  activeFilters?: ActiveFilter[];
  onClearAll?: () => void;
  className?: string;
}

export function FilterBar({ filters, dateRange, activeFilters = [], onClearAll, className }: FilterBarProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span>Filters:</span>
      </div>

      {dateRange && (
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => dateRange.onChange(e.target.value, dateRange.end)}
            className="h-10 rounded-md border border-input bg-background pl-10 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      )}

      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value || "all"}
          onValueChange={(v) => filter.onChange(filter.key, v)}
        >
          <SelectTrigger className="h-10 w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}s</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}

      {activeFilters.map((f) => (
        <Badge key={f.key} variant="secondary" className="gap-1">
          <span className="text-muted-foreground">{f.label}:</span>
          <span>{f.value}</span>
        </Badge>
      ))}

      {onClearAll && activeFilters.length > 0 && (
        <Button variant="ghost" size="sm" onClick={onClearAll} className="h-8 text-xs">
          Clear all
        </Button>
      )}
    </div>
  );
}
