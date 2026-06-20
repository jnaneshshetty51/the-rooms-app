# UI/UX Audit Report

**Date:** 2026-06-19
**Auditor:** Code Agent
**Scope:** All portals (Admin, Front-Office, Super-Admin, Guest-Portal, Web)

---

## 1. Layout Inconsistencies

| Portal | Issue | File | Severity |
|--------|-------|------|----------|
| **Front-Office** | Layout is a client component (`"use client"`) with inline sidebar, unlike Admin/Super-Admin which use server layouts | `apps/front-office/src/app/(dashboard)/layout.tsx:1` | **High** |
| **Front-Office** | Sidebar width is `w-72` (288px) while Admin/Super-Admin use `w-64` (256px) | `apps/front-office/src/app/(dashboard)/layout.tsx:39` | **Medium** |
| **Front-Office** | Main content uses `p-6` padding while Admin uses `p-6` in main but Guest-Portal uses `p-4` in AppShell | `apps/front-office/src/app/(dashboard)/layout.tsx:76` vs `packages/ui/src/components/layout/AppShell.tsx:18` | **Medium** |
| **Guest-Portal** | Layout uses both `AppShell` from UI package AND custom mobile layout logic instead of consistent pattern | `apps/guest-portal/src/app/(guest)/layout.tsx:40-73` | **Medium** |
| **All Portals** | No consistent container max-width; content stretches full width on large screens | Multiple files | **Low** |
| **Super-Admin** | Dashboard content uses `p-4 md:p-6 lg:p-8` (progressive) while other portals use fixed padding | `apps/super-admin/src/app/(super-admin)/dashboard/_components/DashboardContent.tsx:230` | **Low** |

---

## 2. Navigation Problems

| Portal | Issue | File | Severity |
|--------|-------|------|----------|
| **Front-Office** | Navigation is a flat list in layout.tsx, not component-based; sections marked only by comments | `apps/front-office/src/app/(dashboard)/layout.tsx:10-29` | **High** |
| **Front-Office** | No collapsible sections; all 17 items visible without grouping | `apps/front-office/src/app/(dashboard)/layout.tsx:47-55` | **Medium** |
| **Guest-Portal** | BottomTabNav has 5 items but Desktop sidebar has 8 items - inconsistent navigation between breakpoints | `apps/guest-portal/src/components/navigation/BottomTabNav.tsx:11-16` vs `apps/guest-portal/src/app/(guest)/layout.tsx:12-21` | **High** |
| **Guest-Portal** | BottomTabNav uses hardcoded colors `#E17055` and `#636E72` instead of design tokens | `apps/guest-portal/src/components/navigation/BottomTabNav.tsx:44-51` | **Medium** |
| **Admin** | Navigation sections use `space-y-6` between sections but `space-y-0.5` within sections - inconsistent gap | `apps/admin/src/app/(dashboard)/_components/AdminSidebarClient.tsx:173-202` | **Low** |
| **Super-Admin** | Property selector is within sidebar; Admin has no property selector pattern | `apps/super-admin/src/app/(super-admin)/_components/SuperAdminLayout.tsx:90-169` | **Low** |
| **All** | Logo heights vary: Admin `h-14`, Super-Admin `h-14`, Guest-Portal `h-16` (desktop) / `h-10` (mobile) | Multiple files | **Low** |

---

## 3. Component Issues

| Portal | Issue | Component | Severity |
|--------|-------|-----------|----------|
| **Front-Office** | Uses `ToastProvider` from `@the-rooms/ui` but renders inline in layout instead of at app root | `apps/front-office/src/app/(dashboard)/layout.tsx:77` | **High** |
| **Front-Office** | Uses hardcoded colors `#2D3436`, `#E17055` throughout layout instead of design system tokens | `apps/front-office/src/app/(dashboard)/layout.tsx:39,51,72-73` | **High** |
| **Front-Office** | Inline button styling `rounded-lg` vs Admin uses `min-h-[44px]` for touch targets | `apps/front-office/src/app/(dashboard)/layout.tsx:51-52` | **Medium** |
| **Guest-Portal** | Uses custom `NotificationsBell` component in `apps/guest-portal/src/components/notifications/` while Admin has same in `@/components/notifications/` | Duplicate component | **Medium** |
| **Admin** | Custom `StatCard` in `@/components/` vs shared `StatCard` in `@the-rooms/ui` - potential duplication | `apps/admin/src/app/(dashboard)/dashboard/page.tsx` imports from `@the-rooms/ui` | **Low** |
| **All** | `ConfirmDialog` exists in `@the-rooms/ui` but `night-audit/page.tsx` uses native `confirm()` | `apps/front-office/src/app/(dashboard)/night-audit/page.tsx:181,210` | **Medium** |
| **Guest-Portal** | Uses `Card` from `@the-rooms/ui` with hardcoded border colors like `border-[#E17055]/30` | `apps/guest-portal/src/app/(guest)/dashboard/page.tsx:155` | **Medium** |
| **Super-Admin** | Uses `LoadingSpinner` from `@the-rooms/ui` but `StatCard` lacks loading state support | `apps/super-admin/src/app/(super-admin)/dashboard/_components/DashboardContent.tsx` | **Low** |

---

## 4. Missing States

| Portal | Page | Missing State | Severity |
|--------|------|---------------|----------|
| **Front-Office** | Night Audit | No skeleton loading for initial data fetch | `apps/front-office/src/app/(dashboard)/night-audit/page.tsx:251-257` | **Medium** |
| **Admin** | Bookings | DataTable shows "No results" but no empty state illustration | `apps/admin/src/app/(dashboard)/bookings/page.tsx:252-262` uses `EmptyState` but with basic icon | **Low** |
| **Guest-Portal** | Dashboard | Uses skeleton in Card but not full-page loading state | `apps/guest-portal/src/app/(guest)/dashboard/page.tsx:87-102` | **Low** |
| **All** | Various | No "no network connection" offline state UI | Multiple | **Medium** |
| **All** | Various | No optimistic update feedback (loading spinners on buttons during mutations) | Multiple | **Medium** |
| **Super-Admin** | Dashboard | No error boundary around individual dashboard sections | `apps/super-admin/src/app/(super-admin)/dashboard/_components/DashboardContent.tsx` | **Medium** |
| **Front-Office** | Night Audit | Action buttons disable during loading but no toast confirmation | `apps/front-office/src/app/(dashboard)/night-audit/page.tsx` | **Low** |

---

## 5. Layout Recommendations

### Proposed Layout Structure

All dashboard layouts should follow consistent structure:

```
┌─────────────────────────────────────────────────────────┐
│  Mobile: Header (logo, hamburger, user)                │
│  Desktop: Sidebar (w-64, fixed)                         │
├─────────────────────────────────────────────────────────┤
│  Desktop: Header (breadcrumb, notifications, user)       │
│  Mobile: (Header part of content area)                   │
├─────────────────────────────────────────────────────────┤
│  Content Area (flex-1, overflow-y-auto)                  │
│  - PageHeader at top                                    │
│  - Max-width container (optional)                        │
│  - Page-specific content                                 │
└─────────────────────────────────────────────────────────┘
```

### Spacing Standards

| Element | Value | Notes |
|---------|-------|-------|
| Sidebar width | `w-64` (256px) | Standard across all portals |
| Sidebar logo height | `h-14` (56px) | Consistent |
| Header height | `h-16` (64px) | Desktop |
| Mobile header | `h-14` (56px) | Mobile only |
| Content padding | `p-6` | Standard for pages |
| Card padding | `p-6` | CardContent default |
| Section gap | `space-y-6` | Between major sections |
| Grid gap | `gap-4` | Default grid gap |
| Touch target min | `min-h-[44px]` | For mobile buttons |

### Container Widths

- Add optional `max-w-7xl mx-auto` for content containers on large screens
- Use `max-w-screen-xl` for data tables to prevent excessive stretching

---

## 6. Navigation Recommendations

### Proposed Menu Structure

**Admin Portal (9 sections):**
1. Overview (Dashboard, Room Board, Quick Actions)
2. Reservations (All Bookings, Check-ins, Check-outs, No Shows)
3. Operations (Housekeeping, Maintenance, Complaints, Night Audit, Lost & Found)
4. Guests & CRM (Guest Profiles, Blacklist/VIP)
5. Finance (Invoices, Payments, Expenses, Cash Management)
6. Master Data (Rooms, Room Types, Amenities, Staff, Discounts)
7. Integrations (Channels, SMS/WhatsApp, Payment Gateways)
8. Configuration (Property Settings, Invoice Settings, Pricing Rules)
9. System (Reports, Audit Logs, Announcements, Notifications, Backups)

**Front-Office Portal (should be restructured):**
- Convert flat list to sectioned navigation matching Admin
- Use collapsible sections to reduce cognitive load

**Super-Admin Portal (4 sections - good):**
- Overview (Dashboard, Financial, Analytics)
- Management (Staff & Users, Expenses, Audit Logs)
- Communications (Alerts & Logs)
- System (System Health, Security, Backups, Settings)

**Guest Portal:**
- Align desktop sidebar and mobile bottom nav items
- Suggested: Dashboard, Bookings, Documents, Services, Payments, Profile

### Hierarchy Improvements

1. **Consistent active state indicator** - Admin uses `bg-white/10` with `ChevronRight`, Super-Admin uses `bg-white/10` with `ChevronRight`, Guest uses `bg-primary` - standardize
2. **Section labels** - Admin uses `text-[10px] uppercase tracking-wider text-white/30` - Super-Admin uses same - Guest Portal sidebar has no section labels (desktop)
3. **Logout placement** - All portals place logout at bottom of sidebar - consistent

---

## 7. Component Recommendations

### Components to Standardize

| Component | Current State | Recommendation |
|-----------|---------------|----------------|
| **Sidebar** | Admin/Super-Admin/Guest-Portal each have custom sidebar | Create unified `DashboardSidebar` in `@the-rooms/ui` with sections, collapse support |
| **Header** | Admin/Super-Admin have separate header components | Create unified `DashboardHeader` in `@the-rooms/ui` |
| **Toast Notifications** | Front-Office wraps children in `ToastProvider` instead of app-level | Remove from layout, ensure app-level provider handles all portals |
| **EmptyState** | Exists in `@the-rooms/ui` but not always used | Replace all inline empty states with `EmptyState` component |
| **StatCard** | Good in `@the-rooms/ui` | Add `loading` prop for skeleton state |
| **LoadingSpinner** | Good in `@the-rooms/ui` | Already standardized |

### Components to Create

| Component | Purpose |
|-----------|---------|
| `PageContainer` | Wraps content with consistent padding, max-width, optional header |
| `SectionHeader` | For section titles within pages (not PageHeader) |
| `ActionMessage` | Reusable inline feedback (success/error) for forms |
| `OfflineIndicator` | Shows when network is unavailable |
| `PropertySelector` | Move from SuperAdminLayout to shared component |

---

## 8. Priority Fix List

### High Priority (Fix Immediately)

1. **Front-Office Layout Architecture**
   - Convert `apps/front-office/src/app/(dashboard)/layout.tsx` to server component
   - Extract sidebar to component like Admin/Super-Admin pattern

2. **ToastProvider Location**
   - Remove `ToastProvider` wrapper from `apps/front-office/src/app/(dashboard)/layout.tsx`
   - Ensure toast works via app-level provider in `apps/web/src/app/layout.tsx`

3. **Guest Portal Navigation Inconsistency**
   - Align `BottomTabNav` items with desktop sidebar items
   - Use design tokens for colors in `BottomTabNav`

4. **Hardcoded Colors in Front-Office**
   - Replace `#2D3436`, `#E17055` with CSS variables or design tokens

### Medium Priority (Fix in Sprint)

5. **Sidebar Width Standardization**
   - Change Front-Office sidebar from `w-72` to `w-64`

6. **Content Padding Consistency**
   - Review and standardize `p-4` vs `p-6` across portals
   - Consider `p-4 md:p-6` responsive pattern

7. **Native confirm() Replacement**
   - Replace with `ConfirmDialog` from `@the-rooms/ui` in night-audit and other pages

8. **Loading States Enhancement**
   - Add skeleton loading states to night-audit page
   - Add `loading` prop support to `StatCard`

9. **Design Token Usage**
   - Replace hardcoded colors in Guest-Portal dashboard cards
   - Ensure all portals use `text-primary`, `text-muted-foreground` etc.

### Low Priority (Technical Debt)

10. **Logo Height Standardization** - Admin/Super-Admin `h-14`, Guest-Portal `h-16` desktop
11. **Container Max-Width** - Consider adding max-width containers for large screens
12. **Section Gap Variation** - Admin uses `space-y-6` between nav sections, ensure consistent
13. **PropertySelector Extraction** - Move from SuperAdminLayout to shared component

---

## Appendix: File Reference

### Layout Files Examined
- `apps/admin/src/app/(dashboard)/layout.tsx`
- `apps/admin/src/app/(dashboard)/_components/AdminSidebarClient.tsx`
- `apps/admin/src/app/(dashboard)/_components/AdminHeaderClient.tsx`
- `apps/front-office/src/app/(dashboard)/layout.tsx`
- `apps/super-admin/src/app/(super-admin)/layout.tsx`
- `apps/super-admin/src/app/(super-admin)/_components/SuperAdminLayout.tsx`
- `apps/guest-portal/src/app/(guest)/layout.tsx`
- `apps/web/src/app/layout.tsx`

### Navigation Components Examined
- `apps/admin/src/app/(dashboard)/_components/AdminSidebarClient.tsx`
- `apps/super-admin/src/app/(super-admin)/_components/SuperAdminLayout.tsx`
- `apps/guest-portal/src/app/(guest)/layout.tsx` (PortalSidebar usage)
- `apps/guest-portal/src/components/navigation/BottomTabNav.tsx`

### Shared UI Components
- `packages/ui/src/components/layout/AppShell.tsx`
- `packages/ui/src/components/layout/PageHeader.tsx`
- `packages/ui/src/components/layout/PortalSidebar.tsx`
- `packages/ui/src/components/dashboard/StatCard.tsx`
- `packages/ui/src/components/dashboard/DataTable.tsx`
- `packages/ui/src/components/dashboard/EmptyState.tsx`
- `packages/ui/src/components/dashboard/LoadingSpinner.tsx`
- `packages/ui/src/components/ui/card.tsx`
- `packages/ui/src/components/ui/skeleton.tsx`

### Page Files Examined
- `apps/admin/src/app/(dashboard)/dashboard/page.tsx`
- `apps/admin/src/app/(dashboard)/bookings/page.tsx`
- `apps/super-admin/src/app/(super-admin)/dashboard/_components/DashboardContent.tsx`
- `apps/guest-portal/src/app/(guest)/dashboard/page.tsx`
- `apps/front-office/src/app/(dashboard)/night-audit/page.tsx`

### Error Handling Files
- `apps/admin/src/app/(dashboard)/error.tsx`
- `apps/front-office/src/app/(dashboard)/error.tsx`
- `apps/super-admin/src/app/(super-admin)/error.tsx`
- `apps/guest-portal/src/app/(guest)/error.tsx`
