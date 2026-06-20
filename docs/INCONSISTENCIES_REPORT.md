# Design Inconsistencies Audit Report

## Executive Summary

This audit identified **8 categories of inconsistencies** across 5 portals. The good news is that all apps already extend from a shared `packages/ui/tailwind.config.ts`, but individual app `globals.css` files override CSS variables inconsistently.

## 1. Inconsistencies Found

### 1.1 CSS Variable Definitions

| App | Issue | Severity |
|-----|-------|----------|
| `super-admin` | Has duplicate legacy hex-based variables (`--color-primary`, `--color-secondary`, etc.) | High |
| `super-admin` | Uses `Inter` font for body instead of `DM Sans` | Medium |
| `web` | `--ring` uses secondary color (coral) instead of primary | Medium |
| `web` | `--radius` is `0.75rem` instead of `0.5rem` | Low |
| `packages/ui/globals.css` | `--foreground` uses `220 10% 20%` instead of `200 5% 21%` | Low |

### 1.2 Color Palette Differences

| Token | admin, front-office, guest-portal, web | super-admin | packages/ui |
|-------|----------------------------------------|-------------|-------------|
| `--foreground` | `200 5% 21%` | `200 10% 20%` | `220 10% 20%` |
| `--primary` | `200 5% 21%` | `200 10% 20%` | `200 5% 21%` |
| `--muted` | `200 6% 46%` | `200 14% 90%` | `200 6% 46%` |
| `--accent` | `200 10% 87%` | `200 14% 90%` | `200 10% 87%` |

### 1.3 Font Family Inconsistencies

| App | Body Font | Heading Font |
|-----|-----------|--------------|
| admin | DM Sans | DM Sans |
| front-office | DM Sans | DM Sans |
| guest-portal | DM Sans | DM Sans |
| web | DM Sans | DM Sans |
| super-admin | **Inter** | **DM Sans** |

### 1.4 Tailwind Static Color Issue

**Problem:** Room status colors in `tailwind.config.ts` are hardcoded hex values:
```typescript
vacant: "#10B981",
occupied: "#EF4444",
maintenance: "#F59E0B",
blocked: "#6B7280",
```

**Issue:** These do not respect dark mode. Dark mode requires CSS variables.

**Fix Applied:** Updated to use CSS variables:
```typescript
vacant: "hsl(var(--room-vacant))",
occupied: "hsl(var(--room-occupied))",
maintenance: "hsl(var(--room-maintenance))",
blocked: "hsl(var(--room-blocked))",
```

### 1.5 Super Admin Legacy Variables

`apps/super-admin/src/app/globals.css` contains deprecated variables:
```css
--color-primary: #2D3436;
--color-secondary: #E17055;
--color-accent: #DFE6E9;
--color-background: #FAFAF8;
--color-card: #FFFFFF;
--color-muted: #636E72;
--color-success: #00B894;
--color-warning: #FDCB6E;
--color-destructive: #E17055;
```

These should be removed as they duplicate the standard HSL variables.

### 1.6 Scrollbar Styling

| App | Track Color | Thumb Color |
|-----|-------------|-------------|
| admin, front-office, guest-portal, web | `#FAFAF8` (hardcoded) | `#DFE6E9` (hardcoded) |
| packages/ui | `hsl(var(--background))` | `hsl(var(--muted))` |

### 1.7 Web App Custom CSS

`apps/web/src/app/globals.css` contains custom animations and gradients not in other apps:
- `.hero-overlay` gradient
- `.card-hover` transition
- `@keyframes fadeInUp`
- `.pulse-ring` animation

These are likely intentional branding for the marketing site but should be documented.

## 2. Proposed Unified Token Values

### 2.1 Standard Color Tokens

| Token | Unified Value | HSL |
|-------|---------------|-----|
| `--background` | Light gray | `0 0% 98%` |
| `--foreground` | Dark gray | `200 5% 21%` |
| `--primary` | Dark gray | `200 5% 21%` |
| `--primary-foreground` | Off-white | `40 18% 96%` |
| `--secondary` | Coral | `11 70% 60%` |
| `--secondary-foreground` | White | `0 0% 100%` |
| `--muted` | Medium gray | `200 6% 46%` |
| `--accent` | Light gray | `200 10% 87%` |
| `--destructive` | Red | `0 84% 60%` |
| `--success` | Green | `158 84% 38%` |
| `--warning` | Amber | `38 92% 50%` |
| `--border` | Light border | `0 0% 90%` |
| `--ring` | Primary | `200 5% 21%` |
| `--radius` | 8px | `0.5rem` |

### 2.2 Room Status Colors

| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--room-vacant` | `158 84% 38%` | `158 64% 32%` |
| `--room-occupied` | `0 84% 60%` | `0 64% 50%` |
| `--room-maintenance` | `38 92% 50%` | `38 72% 45%` |
| `--room-blocked` | `200 6% 46%` | `200 6% 56%` |

## 3. Files Requiring Updates

### 3.1 High Priority (Must Fix)

| File | Issue | Action |
|------|-------|--------|
| `apps/super-admin/src/app/globals.css` | Legacy hex variables | Remove lines 5-14 |
| `apps/super-admin/src/app/globals.css` | Uses Inter font | Change to DM Sans |
| `packages/ui/src/tailwind.config.ts` | Hardcoded room colors | Updated ✓ |

### 3.2 Medium Priority (Should Fix)

| File | Issue | Action |
|------|-------|--------|
| `apps/web/src/app/globals.css` | `--ring` uses coral | Change to `200 5% 21%` |
| `apps/web/src/app/globals.css` | `--radius` 0.75rem | Change to `0.5rem` |
| `packages/ui/src/globals.css` | `--foreground` 220 10% 20% | Change to `200 5% 21%` |

### 3.3 Low Priority (Nice to Have)

| File | Issue | Action |
|------|-------|--------|
| All apps | Hardcoded scrollbar colors | Use CSS variables |
| `apps/web/src/app/globals.css` | Custom animations | Document as web-specific |

## 4. Files Created/Modified

### Created

| File | Purpose |
|------|---------|
| `packages/ui/src/design-system.ts` | Unified design tokens |
| `docs/DESIGN_SYSTEM.md` | Design system documentation |
| `docs/INCONSISTENCIES_REPORT.md` | This report |

### Modified

| File | Change |
|------|--------|
| `packages/ui/src/globals.css` | Added room status CSS variables, fixed scrollbar colors |
| `packages/ui/src/tailwind.config.ts` | Changed room colors to use CSS variables |
| `packages/ui/src/index.ts` | Added design system exports |

## 5. Recommendations

1. **Remove legacy variables** from `apps/super-admin/src/app/globals.css` (lines 5-14)
2. **Standardize font** to DM Sans across all apps
3. **Add dark mode support** to room status colors via CSS variables
4. **Update `packages/ui/globals.css`** to match the standard color values used in other apps
5. **Document web-specific customizations** in `apps/web` if intentional

## 6. Verification Checklist

After applying fixes, verify:

- [ ] All apps use same `--foreground` value (`200 5% 21%`)
- [ ] All apps use `--ring` = `200 5% 21%`
- [ ] All apps use `--radius` = `0.5rem`
- [ ] Super-admin uses DM Sans for body font
- [ ] Super-admin has no legacy `--color-*` variables
- [ ] Room status colors work in dark mode
