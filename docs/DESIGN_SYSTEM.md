# Design System - The Rooms

Unified design system for all The Rooms portals (admin, front-office, super-admin, guest-portal, web).

## Overview

All portals extend from a shared configuration in `packages/ui/`:

- **Tailwind Config**: `packages/ui/src/tailwind.config.ts`
- **Global CSS**: `packages/ui/src/globals.css`
- **Design Tokens**: `packages/ui/src/design-system.ts`

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Apps (5 portals)                        │
│  admin | front-office | super-admin | guest-portal | web        │
└─────────────────────────────────────────────────────────────────┘
                                │
                    All extend packages/ui
                                │
          ┌─────────────────────┴─────────────────────┐
          │              packages/ui                   │
          │  ┌─────────────────────────────────────┐   │
          │  │  tailwind.config.ts (theme extend)  │   │
          │  │  globals.css (CSS variables)        │   │
          │  │  design-system.ts (token exports)   │   │
          │  └─────────────────────────────────────┘   │
          │  ┌─────────────────────────────────────┐   │
          │  │  components/ui/* (Button, Card, ...) │   │
          │  │  components/dashboard/* (DataTable) │   │
          │  │  components/hotel/* (RoomCard, ...)  │   │
          │  └─────────────────────────────────────┘   │
          └────────────────────────────────────────────┘
```

## CSS Variables

All color and design tokens are defined as CSS custom properties in HSL format for maximum flexibility.

### Color Tokens (Light Mode)

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--background` | `0 0% 98%` | `#FAFAF9` | Page background |
| `--foreground` | `200 5% 21%` | `#363D42` | Primary text |
| `--card` | `0 0% 100%` | `#FFFFFF` | Card surfaces |
| `--card-foreground` | `200 5% 21%` | `#363D42` | Card text |
| `--primary` | `200 5% 21%` | `#363D42` | Primary actions |
| `--primary-foreground` | `40 18% 96%` | `#F5F2ED` | Text on primary |
| `--secondary` | `11 70% 60%` | `#E17055` | Secondary/coral accent |
| `--secondary-foreground` | `0 0% 100%` | `#FFFFFF` | Text on secondary |
| `--muted` | `200 6% 46%` | `#6F787F` | Muted backgrounds |
| `--muted-foreground` | `200 6% 46%` | `#6F787F` | Muted text |
| `--accent` | `200 10% 87%` | `#DDE1DE` | Accent backgrounds |
| `--accent-foreground` | `200 5% 21%` | `#363D42` | Text on accent |
| `--destructive` | `0 84% 60%` | `#EF4444` | Error/destructive |
| `--destructive-foreground` | `0 0% 100%` | `#FFFFFF` | Text on destructive |
| `--success` | `158 84% 38%` | `#10B981` | Success states |
| `--warning` | `38 92% 50%` | `#F59E0B` | Warning states |
| `--border` | `0 0% 90%` | `#E6E6E6` | Borders |
| `--input` | `0 0% 90%` | `#E6E6E6` | Input borders |
| `--ring` | `200 5% 21%` | `#363D42` | Focus rings |

### Room Status Colors

| Token | HSL Value | Hex Approx | Usage |
|-------|-----------|------------|-------|
| `--room-vacant` | `158 84% 38%` | `#10B981` | Vacant rooms |
| `--room-occupied` | `0 84% 60%` | `#EF4444` | Occupied rooms |
| `--room-maintenance` | `38 92% 50%` | `#F59E0B` | Maintenance rooms |
| `--room-blocked` | `200 6% 46%` | `#6F787F` | Blocked rooms |

### Dark Mode

Dark mode variants are defined in `.dark` class selector with adjusted HSL values for better contrast.

## Typography

### Font Family

- **Primary Font**: DM Sans (Google Fonts)
- **Fallback**: system-ui, sans-serif

```css
font-family: 'DM Sans', system-ui, sans-serif;
```

### Font Weights

| Name | Value |
|------|-------|
| Normal | 400 |
| Medium | 500 |
| Semibold | 600 |
| Bold | 700 |

### Font Sizes

| Token | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 12px | 16px |
| `text-sm` | 14px | 20px |
| `text-base` | 16px | 24px |
| `text-lg` | 18px | 28px |
| `text-xl` | 20px | 28px |
| `text-2xl` | 24px | 32px |
| `text-3xl` | 30px | 36px |
| `text-4xl` | 36px | 40px |
| `text-5xl` | 48px | 58px |

## Spacing

Base unit: 4px

| Token | Value |
|-------|-------|
| `space-1` | 4px |
| `space-2` | 8px |
| `space-3` | 12px |
| `space-4` | 16px |
| `space-5` | 20px |
| `space-6` | 24px |
| `space-8` | 32px |
| `space-10` | 40px |
| `space-12` | 48px |
| `space-16` | 64px |

## Border Radius

| Token | Value |
|-------|-------|
| `rounded-none` | 0 |
| `rounded-sm` | calc(var(--radius) - 4px) ≈ 4px |
| `rounded` | var(--radius) ≈ 8px |
| `rounded-md` | calc(var(--radius) - 2px) ≈ 6px |
| `rounded-lg` | var(--radius) ≈ 8px |
| `rounded-xl` | calc(var(--radius) + 4px) ≈ 12px |
| `rounded-2xl` | calc(var(--radius) + 8px) ≈ 16px |
| `rounded-full` | 9999px |

Note: `--radius` is set to `0.5rem` (8px) by default.

## Components

### Button

**Variants:**

| Variant | Usage |
|---------|-------|
| `default` | Primary actions (dark bg) |
| `destructive` | Delete/danger actions |
| `outline` | Secondary actions with border |
| `secondary` | Secondary accent (coral) |
| `ghost` | Subtle actions on hover |
| `link` | Inline text links |

**Sizes:**

| Size | Height | Padding | Use Case |
|------|--------|---------|----------|
| `sm` | 36px | 12px 16px | Compact UI |
| `default` | 44px | 10px 20px | Standard |
| `lg` | 48px | 12px 32px | Primary CTAs |
| `icon` | 44px | 10px | Icon buttons |
| `icon-sm` | 36px | 8px | Small icon buttons |

**States:**
- Default, Hover (`hover:bg-primary/90`), Active (`active:scale-[0.98]`), Disabled (`disabled:opacity-50`), Loading

### Input

- Height: 44px (touch-friendly)
- Border radius: `var(--radius)` (8px)
- Focus: Ring with 2px offset
- Min touch target: 44x44px

### Card

- Border radius: `rounded-xl` (12px)
- Padding: 24px (1.5rem)
- Shadow: `shadow-sm` with hover `hover:shadow-md`
- Border: 1px solid `hsl(var(--border))`

### Badge

- Border radius: `rounded-full` (pill shape)
- Padding: 2px 10px
- Font size: 12px
- Font weight: 600

**Status Badge Variants:**

| Status | Color | Usage |
|--------|-------|-------|
| `default` | Primary | Default state |
| `secondary` | Secondary (coral) | Secondary info |
| `destructive` | Red | Errors, cancellations |
| `success` | Green | Confirmations |
| `warning` | Amber | Warnings, pending |
| `outline` | Border only | Neutral |

### Table

- Header: `font-semibold` text, bottom border
- Cells: `px-4 py-3`
- Hover row: `hover:bg-accent`
- Striped: `odd:bg-muted/30`

## Shadows

| Token | Value |
|-------|-------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` |

## Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `z-dropdown` | 50 | Dropdown menus |
| `z-sticky` | 100 | Sticky headers |
| `z-overlay` | 150 | Overlays |
| `z-modal` | 200 | Modals |
| `z-popover` | 250 | Popovers |
| `z-toast` | 300 | Toast notifications |

## Animations

| Animation | Duration | Easing | Usage |
|-----------|----------|--------|-------|
| `transition-fast` | 150ms | ease | Immediate feedback |
| `transition-default` | 200ms | ease | Standard transitions |
| `transition-slow` | 300ms | ease | Emphasized transitions |

**Keyframes:**

| Name | Description |
|------|-------------|
| `fadeIn` | Opacity 0 → 1 |
| `fadeInUp` | Opacity 0 → 1, translateY 10px → 0 |
| `slideInRight` | translateX 100% → 0 |
| `scaleIn` | Opacity 0 → 1, scale 0.95 → 1 |

## Usage

### In Components

```tsx
import { Button } from "@the-rooms/ui";
import { cn } from "@the-rooms/ui";

export function MyComponent({ className }) {
  return (
    <Button 
      variant="default" 
      size="default"
      className={cn("my-custom-class", className)}
    >
      Click me
    </Button>
  );
}
```

### Using CSS Variables Directly

```tsx
<div style={{ 
  backgroundColor: 'hsl(var(--primary))',
  color: 'hsl(var(--primary-foreground))',
  borderRadius: 'var(--radius)',
}}>
  Content
</div>
```

### Using Design Tokens in Code

```tsx
import { 
  colors, 
  typography, 
  spacing, 
  buttonSizes 
} from "@the-rooms/ui/design-system";

// Use in style objects or className
const styles = {
  padding: buttonSizes.default.padding,
  fontFamily: typography.fontFamily.sans,
};
```

## Migration Guide

### For Apps Using Old Color Values

**Before (hardcoded):**
```css
background-color: #FAFAF8;
color: #2D3436;
```

**After (CSS variables):**
```css
background-color: hsl(var(--background));
color: hsl(var(--foreground));
```

### For Apps Using Old Hex Variables

**Before (super-admin style):**
```css
--color-primary: #2D3436;
--color-secondary: #E17055;
```

**After:**
Remove these and use the standard HSL variables defined in `packages/ui/src/globals.css`.

## Files to Update for Conformance

See [INCONSISTENCIES_REPORT.md](./INCONSISTENCIES_REPORT.md) for the complete list of files that need updates.

## Version

Current version: 1.0.0 (Initial unified design system)
