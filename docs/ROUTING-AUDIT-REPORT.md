# COMPREHENSIVE ROUTING SYSTEM AUDIT REPORT

**Date:** 2026-06-19  
**Auditor:** Code Agent  
**Scope:** All Portal Applications

---

## 1. COMPLETE ROUTE MAP TABLE

### 1.1 Admin Portal (`apps/admin/`)

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/login` | `src/app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/amenities` | `src/app/(dashboard)/amenities/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/announcements` | `src/app/(dashboard)/announcements/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/attendance` | `src/app/(dashboard)/attendance/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/audit-logs` | `src/app/(dashboard)/audit-logs/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/automation` | `src/app/(dashboard)/automation/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/blackout-dates` | `src/app/(dashboard)/blackout-dates/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/booking-recovery` | `src/app/(dashboard)/booking-recovery/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings` | `src/app/(dashboard)/bookings/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]` | `src/app/(dashboard)/bookings/[id]/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/cash-management` | `src/app/(dashboard)/cash-management/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/channels` | `src/app/(dashboard)/channels/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/channels/[id]` | `src/app/(dashboard)/channels/[id]/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/channels/[id]/sync` | `src/app/(dashboard)/channels/[id]/sync/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/complaints` | `src/app/(dashboard)/complaints/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/corporate-contracts` | `src/app/(dashboard)/corporate-contracts/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/coupons` | `src/app/(dashboard)/coupons/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/damage-assessments` | `src/app/(dashboard)/damage-assessments/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/discounts` | `src/app/(dashboard)/discounts/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/disputes` | `src/app/(dashboard)/disputes/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/documents` | `src/app/(dashboard)/documents/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/dynamic-pricing` | `src/app/(dashboard)/dynamic-pricing/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/exceptions` | `src/app/(dashboard)/exceptions/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/expenses` | `src/app/(dashboard)/expenses/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/fraud-detection` | `src/app/(dashboard)/fraud-detection/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/guests` | `src/app/(dashboard)/guests/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/guests/[id]` | `src/app/(dashboard)/guests/[id]/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/guests/[id]/history` | `src/app/(dashboard)/guests/[id]/history/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/guests/[id]/preferences` | `src/app/(dashboard)/guests/[id]/preferences/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/housekeeping` | `src/app/(dashboard)/housekeeping/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/import` | `src/app/(dashboard)/import/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/integrations/payments` | `src/app/(dashboard)/integrations/payments/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/integrations/sms` | `src/app/(dashboard)/integrations/sms/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/inventory` | `src/app/(dashboard)/inventory/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/invoices` | `src/app/(dashboard)/invoices/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/lost-found` | `src/app/(dashboard)/lost-found/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/loyalty` | `src/app/(dashboard)/loyalty/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/maintenance` | `src/app/(dashboard)/maintenance/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/monthly-billing` | `src/app/(dashboard)/monthly-billing/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/night-audit` | `src/app/(dashboard)/night-audit/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/notifications` | `src/app/(dashboard)/notifications/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/notifications/logs` | `src/app/(dashboard)/notifications/logs/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/offline-entries` | `src/app/(dashboard)/offline-entries/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/ota-sync` | `src/app/(dashboard)/ota-sync/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/package-deals` | `src/app/(dashboard)/package-deals/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/payments` | `src/app/(dashboard)/payments/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/quick-actions` | `src/app/(dashboard)/quick-actions/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports` | `src/app/(dashboard)/reports/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/bookings` | `src/app/(dashboard)/reports/bookings/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/daily` | `src/app/(dashboard)/reports/daily/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/occupancy` | `src/app/(dashboard)/reports/occupancy/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/payments` | `src/app/(dashboard)/reports/payments/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/revenue` | `src/app/(dashboard)/reports/revenue/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/room-board` | `src/app/(dashboard)/room-board/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/room-conflicts` | `src/app/(dashboard)/room-conflicts/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/room-types` | `src/app/(dashboard)/room-types/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/rooms` | `src/app/(dashboard)/rooms/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/rooms/[id]` | `src/app/(dashboard)/rooms/[id]/page.tsx` | Dynamic | ADMIN/SUPER_ADMIN | |
| `/dashboard/seasonal-pricing` | `src/app/(dashboard)/seasonal-pricing/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/settings` | `src/app/(dashboard)/settings/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/settings/invoices` | `src/app/(dashboard)/settings/invoices/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/settings/ledger` | `src/app/(dashboard)/settings/ledger/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/settings/pricing` | `src/app/(dashboard)/settings/pricing/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/shifts` | `src/app/(dashboard)/shifts/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/staff` | `src/app/(dashboard)/staff/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/staff-activity` | `src/app/(dashboard)/staff-activity/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/tally-export` | `src/app/(dashboard)/tally-export/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/dashboard/users` | `src/app/(dashboard)/users/page.tsx` | Page | ADMIN/SUPER_ADMIN | |
| `/access-denied` | `src/app/access-denied/page.tsx` | Page | No | Public error page |
| `/offline` | `src/app/offline/page.tsx` | Page | No | PWA offline page |
| `*` | `src/app/not-found.tsx` | Page | No | 404 handler |

**Admin API Routes:** 40+ endpoints under `/api/*`

---

### 1.2 Front Office Portal (`apps/front-office/`)

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/login` | `src/app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings` | `src/app/(dashboard)/bookings/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]` | `src/app/(dashboard)/bookings/[id]/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/addons` | `src/app/(dashboard)/bookings/[id]/addons/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/check-in` | `src/app/(dashboard)/bookings/[id]/check-in/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/check-out` | `src/app/(dashboard)/bookings/[id]/check-out/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/corporate-billing` | `src/app/(dashboard)/bookings/[id]/corporate-billing/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/extend` | `src/app/(dashboard)/bookings/[id]/extend/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/extra-bed` | `src/app/(dashboard)/bookings/[id]/extra-bed/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/folios` | `src/app/(dashboard)/bookings/[id]/folios/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/[id]/reassign` | `src/app/(dashboard)/bookings/[id]/reassign/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/new` | `src/app/(dashboard)/bookings/new/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/no-shows` | `src/app/(dashboard)/bookings/no-shows/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/online` | `src/app/(dashboard)/bookings/online/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/ota` | `src/app/(dashboard)/bookings/ota/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/reservation` | `src/app/(dashboard)/bookings/reservation/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/bookings/stay-modifications` | `src/app/(dashboard)/bookings/stay-modifications/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/complaints` | `src/app/(dashboard)/complaints/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/damage-assessments` | `src/app/(dashboard)/damage-assessments/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/discount-approvals` | `src/app/(dashboard)/discount-approvals/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/documents` | `src/app/(dashboard)/documents/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/guests` | `src/app/(dashboard)/guests/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/guests/[id]` | `src/app/(dashboard)/guests/[id]/page.tsx` | Dynamic | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/housekeeping/mobile` | `src/app/(dashboard)/housekeeping/mobile/page.tsx` | Page | HOUSEKEEPING/FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/lost-found` | `src/app/(dashboard)/lost-found/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/night-audit` | `src/app/(dashboard)/night-audit/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/payments` | `src/app/(dashboard)/payments/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/price-overrides` | `src/app/(dashboard)/price-overrides/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/reports/daily` | `src/app/(dashboard)/reports/daily/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/rooms/board` | `src/app/(dashboard)/rooms/board/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/taxi-bookings` | `src/app/(dashboard)/taxi-bookings/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/dashboard/wakeup-calls` | `src/app/(dashboard)/wakeup-calls/page.tsx` | Page | FRONT_OFFICE/ADMIN/SUPER_ADMIN | |
| `/access-denied` | `src/app/access-denied/page.tsx` | Page | No | |
| `/offline` | `src/app/offline/page.tsx` | Page | No | PWA offline page |
| `*` | `src/app/not-found.tsx` | Page | No | 404 handler |

**Front Office API Routes:** 100+ endpoints under `/api/*`

---

### 1.3 Super Admin Portal (`apps/super-admin/`)

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/login` | `src/app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/dashboard` | `src/app/(super-admin)/dashboard/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/analytics` | `src/app/(super-admin)/analytics/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/audit-logs` | `src/app/(super-admin)/audit-logs/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/backups` | `src/app/(super-admin)/backups/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/communications` | `src/app/(super-admin)/communications/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/expenses` | `src/app/(super-admin)/expenses/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/financial` | `src/app/(super-admin)/financial/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/partners` | `src/app/(super-admin)/partners/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/partners/[id]` | `src/app/(super-admin)/partners/[id]/page.tsx` | Dynamic | SUPER_ADMIN only | |
| `/dashboard/properties` | `src/app/(super-admin)/properties/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/properties/[id]` | `src/app/(super-admin)/properties/[id]/page.tsx` | Dynamic | SUPER_ADMIN only | |
| `/dashboard/security` | `src/app/(super-admin)/security/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/settings` | `src/app/(super-admin)/settings/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/system-health` | `src/app/(super-admin)/system-health/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/users` | `src/app/(super-admin)/users/page.tsx` | Page | SUPER_ADMIN only | |
| `/dashboard/users/[id]` | `src/app/(super-admin)/users/[id]/page.tsx` | Dynamic | SUPER_ADMIN only | |
| `/dashboard/users/[id]/properties` | `src/app/(super-admin)/users/[id]/properties/page.tsx` | Dynamic | SUPER_ADMIN only | |
| `/access-denied` | `src/app/access-denied/page.tsx` | Page | No | |
| `*` | `src/app/not-found.tsx` | Page | No | 404 handler |

**Super Admin API Routes:** ~30 endpoints under `/api/*`

---

### 1.4 Guest Portal - Primary (`apps/guest-portal/`)

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/login` | `src/app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/magic-link` | `src/app/magic-link/page.tsx` | Page | No | Magic link entry |
| `/dashboard` | `src/app/(guest)/dashboard/page.tsx` | Page | GUEST only | |
| `/addons` | `src/app/(guest)/addons/page.tsx` | Page | GUEST only | |
| `/bookings` | `src/app/(guest)/bookings/page.tsx` | Page | GUEST only | |
| `/complaints` | `src/app/(guest)/complaints/page.tsx` | Page | GUEST only | |
| `/documents` | `src/app/(guest)/documents/page.tsx` | Page | GUEST only | |
| `/express-checkout` | `src/app/(guest)/express-checkout/page.tsx` | Page | GUEST only | |
| `/extend-stay` | `src/app/(guest)/extend-stay/page.tsx` | Page | GUEST only | |
| `/feedback` | `src/app/(guest)/feedback/page.tsx` | Page | GUEST only | |
| `/invoices` | `src/app/(guest)/invoices/page.tsx` | Page | GUEST only | |
| `/profile` | `src/app/(guest)/profile/page.tsx` | Page | GUEST only | |
| `/settings/notifications` | `src/app/(guest)/settings/notifications/page.tsx` | Page | GUEST only | |
| `/stay-details` | `src/app/(guest)/stay-details/page.tsx` | Page | GUEST only | |
| `/access-denied` | `src/app/access-denied/page.tsx` | Page | No | |
| `/offline` | `src/app/offline/page.tsx` | Page | No | PWA offline page |
| `*` | `src/app/not-found.tsx` | Page | No | 404 handler |

**Guest Portal (guest-portal) API Routes:** ~25 endpoints under `/api/*`

---

### 1.5 Guest Portal - Secondary (`apps/src/`)

⚠️ **CRITICAL ISSUE: DUPLICATE APPLICATION**

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/login` | `app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/dashboard` | `app/(guest)/dashboard/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/bookings` | `app/(guest)/bookings/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/bookings/[id]/cancel` | `app/(guest)/bookings/[id]/cancel/page.tsx` | Dynamic | GUEST only? | **NO MIDDLEWARE** |
| `/bookings/[id]/modify` | `app/(guest)/bookings/[id]/modify/page.tsx` | Dynamic | GUEST only? | **NO MIDDLEWARE** |
| `/check-in` | `app/(guest)/check-in/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/complaints` | `app/(guest)/complaints/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/documents` | `app/(guest)/documents/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/express-checkout` | `app/(guest)/express-checkout/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/extend-stay` | `app/(guest)/extend-stay/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/feedback` | `app/(guest)/feedback/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/invoices` | `app/(guest)/invoices/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/loyalty` | `app/(guest)/loyalty/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/payments` | `app/(guest)/payments/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/stay-details` | `app/(guest)/stay-details/page.tsx` | Page | GUEST only? | **NO MIDDLEWARE** |
| `/access-denied` | `app/access-denied/page.tsx` | Page | No | |

**Missing:** No middleware.ts, no package.json, no next.config.ts - **NOT A VALID APPLICATION**

---

### 1.6 Web App (`apps/web/`)

| Route | File | Type | Auth Required | Notes |
|-------|------|------|---------------|-------|
| `/` | `src/app/page.tsx` | Page | No | Public home |
| `/login` | `src/app/(auth)/login/page.tsx` | Page | No | Auth route group |
| `/book` | `src/app/(booking)/book/page.tsx` | Page | No | Booking flow |
| `/book/rooms` | `src/app/(booking)/book/rooms/page.tsx` | Page | No | Room selection |
| `/book/details` | `src/app/(booking)/book/details/page.tsx` | Page | No | Guest details |
| `/book/payment` | `src/app/(booking)/book/payment/page.tsx` | Page | No | Payment |
| `/book/confirmation` | `src/app/(booking)/book/confirmation/page.tsx` | Page | No | Confirmation |
| `/amenities` | `src/app/(marketing)/amenities/page.tsx` | Page | No | Marketing |
| `/availability` | `src/app/(marketing)/availability/page.tsx` | Page | No | Marketing |
| `/cancellation` | `src/app/(marketing)/cancellation/page.tsx` | Page | No | Marketing |
| `/contact` | `src/app/(marketing)/contact/page.tsx` | Page | No | Marketing |
| `/faq` | `src/app/(marketing)/faq/page.tsx` | Page | No | Marketing |
| `/home` | `src/app/(marketing)/home/page.tsx` | Page | No | Marketing |
| `/pricing` | `src/app/(marketing)/pricing/page.tsx` | Page | No | Marketing |
| `/privacy` | `src/app/(marketing)/privacy/page.tsx` | Page | No | Marketing |
| `/rooms` | `src/app/(marketing)/rooms/page.tsx` | Page | No | Marketing |
| `/rooms/[id]` | `src/app/(marketing)/rooms/[id]/page.tsx` | Dynamic | No | Room details |
| `/terms` | `src/app/(marketing)/terms/page.tsx` | Page | No | Marketing |
| `/offline` | `src/app/offline/page.tsx` | Page | No | PWA offline page |
| `*` | `src/app/not-found.tsx` | Page | No | 404 handler |

**Web API Routes:** ~30 endpoints under `/api/*`

---

## 2. ISSUES FOUND

### 2.1 CRITICAL Issues

| Issue Type | Route | Problem | Fix Recommendation |
|------------|-------|---------|-------------------|
| **Duplicate Application** | `apps/src/` | Ghost app with no middleware, package.json, or next.config.ts. Routes exist but app is non-functional | **DEPRECATE** `apps/src/` entirely. All routes are duplicates of `apps/guest-portal/` |
| **Missing Middleware** | `apps/src/*` | No authentication/authorization on any route | N/A - app should be removed |
| **Route Conflict** | `/bookings/[id]/cancel` | Exists in both `apps/src/app/(guest)/bookings/[id]/cancel/page.tsx` AND `apps/guest-portal/src/app/(guest)/bookings/[id]/cancel/page.tsx` | Remove `apps/src` |
| **Route Conflict** | `/bookings/[id]/modify` | Exists in `apps/src/app/(guest)/bookings/[id]/modify/page.tsx` only - NOT in guest-portal | Migrate to guest-portal or remove |
| **Missing Route** | `/loyalty` | In `apps/src/` but NOT in `apps/guest-portal/` | Add to guest-portal if needed |
| **Missing Route** | `/payments` | In `apps/src/` but NOT in `apps/guest-portal/` | Add to guest-portal if needed |
| **Missing Route** | `/check-in` | In `apps/src/` but NOT in `apps/guest-portal/` | Add to guest-portal if needed |
| **Inconsistent Auth Check** | `apps/src/` | No middleware means role-based access not enforced | N/A - app should be removed |

### 2.2 High Priority Issues

| Issue Type | Route | Problem | Fix Recommendation |
|------------|-------|---------|-------------------|
| **Deep Nesting** | `/dashboard/bookings/[id]/check-in` | Very deep nesting (6 levels) in front-office | Consider flattening to `/dashboard/check-in/[id]` |
| **Deep Nesting** | `/dashboard/bookings/[id]/check-out` | Very deep nesting (6 levels) in front-office | Consider flattening to `/dashboard/check-out/[id]` |
| **Deep Nesting** | `/dashboard/bookings/[id]/extend` | Very deep nesting in front-office | Consider flattening |
| **Deep Nesting** | `/dashboard/bookings/[id]/folios` | Very deep nesting in front-office | Consider flattening |
| **Dynamic Route** | `/dashboard/guests/[id]/history` | Nested dynamic route - ensure ID validation | Add proper ID validation in page component |
| **Dynamic Route** | `/dashboard/guests/[id]/preferences` | Nested dynamic route - ensure ID validation | Add proper ID validation in page component |
| **Typo in Path** | `apps/super-admin/src/app/(super-admin)/properties//[id/]/` | Double slash in directory name `//[id/]/` | Rename directory to `[id]` |

### 2.3 Medium Priority Issues

| Issue Type | Route | Problem | Fix Recommendation |
|------------|-------|---------|-------------------|
| **Inconsistent Naming** | `/dashboard/bookings/new` vs `/dashboard/bookings/ota` | Mixing `new` with resource names | Consider `/dashboard/bookings/create` |
| **Unlinked Routes** | `/dashboard/offline-entries` | No apparent links from navigation | Verify if still needed |
| **Unlinked Routes** | `/dashboard/ota-sync` | No apparent links from navigation | Verify if still needed |
| **Route Group Overlap** | `(auth)` groups | All apps have `(auth)` route group | Consistent pattern ✓ |
| **Missing Error Page** | `apps/src/` | No `error.tsx` in route group | N/A - app should be removed |
| **Missing Offline Page** | `apps/src/` | No `offline/page.tsx` | N/A - app should be removed |

### 2.4 Low Priority Issues

| Issue Type | Route | Problem | Fix Recommendation |
|------------|-------|---------|-------------------|
| **Inconsistent Case** | `apps/src/` vs `apps/guest-portal/` | Case sensitivity potential | Standardize naming |
| **Missing 404 Page** | `apps/src/` | Uses root not-found | N/A - app should be removed |
| **Route Organization** | Admin has 65+ dashboard routes | May benefit from grouping | Consider domain-based grouping |

---

## 3. MIDDLEWARE CONFIGURATION SUMMARY

| App | Protected Routes | Public Routes | Auth Logic |
|-----|-----------------|---------------|------------|
| **admin** | All except `/login`, `/_next/*`, `/api/auth/*` | `/login`, `/access-denied`, `/api/auth/*` | ADMIN or SUPER_ADMIN only. Redirects to `/login` if unauthenticated, `/access-denied` if wrong role |
| **front-office** | All except `/login`, `/access-denied`, `/api/*`, static assets | `/login`, `/access-denied`, `/api/*`, `/_next/*`, `/icons/*`, `/api/documents/upload` | Any authenticated non-GUEST. HOUSEKEEPING users restricted to `/housekeeping` only |
| **guest-portal** | All except `/login`, `/magic-link`, `/access-denied`, `/api/*` | `/login`, `/magic-link`, `/access-denied`, `/api/*`, `/_next/*`, static assets | GUEST role only. Redirects to `/login` if unauthenticated, `/access-denied` if not GUEST |
| **super-admin** | All except `/login`, `/_next/*`, `/api/auth/*` | `/login`, `/access-denied`, `/api/auth/*` | SUPER_ADMIN only. Redirects to `/login` if unauthenticated, `/access-denied` if wrong role |
| **web** | `/admin/*`, `/staff/*` | All marketing routes, booking flow, `/_next/*`, `/favicon/*`, `/images/*`, `/assets/*`, `/api/public/*` | Public app. Staff routes redirect to `/login` |

### Middleware Issues Identified:

1. **`apps/src/` has NO middleware** - All routes are unprotected
2. **Inconsistent session handling** - `admin` and `super-admin` use `await auth()` pattern, while `front-office` and `guest-portal` use callback pattern `auth((req) => {...})`
3. **Missing callbackUrl** - `front-office` and `guest-portal` don't pass `callbackUrl` on redirect to login

---

## 4. NAVIGATION FLOW DIAGRAM

### Admin Portal Flow
```
Login → [Dashboard]
         ├── Bookings → [Booking Details] → Stay History / Preferences
         ├── Guests → [Guest Details] → History / Preferences
         ├── Rooms → [Room Details]
         ├── Channels → [Channel Details] → Sync
         ├── Reports → Daily / Bookings / Occupancy / Payments / Revenue
         ├── Night Audit
         ├── Housekeeping
         ├── Staff / Shifts / Attendance
         ├── Settings → Invoices / Ledger / Pricing
         └── [60+ other modules]
```

### Front Office Flow
```
Login → [Dashboard]
         ├── Bookings → [Booking Details] → Check-in / Check-out / Extend / Folios / Reassign
         │                      └── Addons / Extra Bed / Corporate Billing
         ├── Guests → [Guest Details]
         ├── Room Board
         ├── Reports → Daily
         ├── Night Audit
         ├── Housekeeping (Mobile)
         └── [Other modules]
```

### Guest Portal Flow (guest-portal)
```
Magic Link → [Dashboard]
              ├── My Bookings → [Booking Details] → Cancel / Modify
              ├── Express Checkout
              ├── Check-in
              ├── Stay Details
              ├── Documents
              ├── Invoices
              ├── Feedback
              ├── Complaints
              ├── Loyalty
              ├── Payments
              ├── Extend Stay
              └── Addons
```

### Super Admin Flow
```
Login → [Dashboard]
         ├── Analytics
         ├── Properties → [Property Details]
         ├── Users → [User Details] → Properties
         ├── Partners → [Partner Details]
         ├── Audit Logs
         ├── System Health
         ├── Backups
         ├── Communications
         ├── Financial
         ├── Expenses
         ├── Security
         └── Settings
```

### Web App Flow (Public)
```
Home → Rooms → [Room Details] → Book
                           └── Booking Flow: Rooms → Details → Payment → Confirmation
```

---

## 5. API ROUTE CONFLICTS

### 5.1 Booking-Related Endpoints

| Endpoint | Admin | Front-Office | Guest-Portal | Web | Notes |
|----------|-------|--------------|--------------|-----|-------|
| `POST /api/bookings` | ✓ | ✓ | ✗ | ✓ | Create booking |
| `GET /api/bookings` | ✓ | ✓ | ✓ | ✓ | List bookings |
| `GET /api/bookings/[id]` | ✓ | ✓ | ✓ | ✓ | Get booking |
| `POST /api/bookings/[id]/cancel` | ✗ | ✗ | ✓ | ✗ | Cancel booking |
| `POST /api/bookings/[id]/check-in` | ✗ | ✓ | ✗ | ✓ | Check-in |
| `POST /api/bookings/[id]/check-out` | ✗ | ✓ | ✗ | ✓ | Check-out |

### 5.2 Guest-Related Endpoints

| Endpoint | Admin | Front-Office | Guest-Portal | Web | Notes |
|----------|-------|--------------|--------------|-----|-------|
| `POST /api/guests` | ✓ | ✓ | ✗ | ✓ | Create guest |
| `GET /api/guests` | ✓ | ✓ | ✗ | ✗ | List guests |
| `GET /api/guests/[id]` | ✓ | ✓ | ✗ | ✓ | Get guest |
| `POST /api/guest-checkin` | ✗ | ✗ | ✓ | ✗ | Guest check-in (separate endpoint) |

### 5.3 Room-Related Endpoints

| Endpoint | Admin | Front-Office | Web | Notes |
|----------|-------|--------------|-----|-------|
| `GET /api/rooms` | ✓ | ✓ | ✓ | List rooms |
| `GET /api/rooms/board` | ✓ | ✓ | ✗ | Room board |
| `POST /api/rooms/[id]/clean` | ✗ | ✓ | ✗ | Mark clean |
| `POST /api/rooms/[id]/mark-dirty` | ✗ | ✓ | ✗ | Mark dirty |

### 5.4 Potential Conflicts

| Conflict | Apps | Issue | Resolution |
|----------|------|-------|------------|
| `/api/bookings` | Admin, Front-Office, Web | All three can create bookings | Admin for admin-created, Web for public booking, Front-Office for front-desk |
| `/api/bookings/[id]/check-in` | Front-Office, Web | Both have check-in endpoint | Web for online pre-checkin, Front-Office for front-desk |
| `/api/guest-checkin` | Guest Portal only | Separate from main guest flow | OK - different purpose |

---

## 6. MISSING ERROR PAGES

| App | not-found.tsx | error.tsx | access-denied | offline | Notes |
|-----|--------------|-----------|---------------|---------|-------|
| admin | ✓ `src/app/not-found.tsx` | ✓ `src/app/(dashboard)/error.tsx` | ✓ `src/app/access-denied/page.tsx` | ✓ `src/app/offline/page.tsx` | ✅ Complete |
| front-office | ✓ `src/app/not-found.tsx` | ✓ `src/app/(dashboard)/error.tsx` | ✓ `src/app/access-denied/page.tsx` | ✓ `src/app/offline/page.tsx` | ✅ Complete |
| super-admin | ✓ `src/app/not-found.tsx` | ✓ `src/app/(super-admin)/error.tsx` | ✓ `src/app/access-denied/page.tsx` | ✗ Missing | ⚠️ Missing offline |
| guest-portal | ✓ `src/app/not-found.tsx` | ✗ Missing | ✓ `src/app/access-denied/page.tsx` | ✓ `src/app/offline/page.tsx` | ⚠️ Missing error.tsx |
| **apps/src** | ✓ `app/(guest)/error.tsx` (in group) | ✓ `app/(guest)/error.tsx` | ✓ `app/access-denied/page.tsx` | ✗ Missing | ⚠️ Deprecated app |
| web | ✓ `src/app/not-found.tsx` | ✗ Missing | ✗ Missing | ✓ `src/app/offline/page.tsx` | ⚠️ Missing error.tsx and access-denied |

### Error Page Status:
- **Admin:** ✅ Complete
- **Front Office:** ✅ Complete
- **Super Admin:** ⚠️ Missing offline page
- **Guest Portal (guest-portal):** ⚠️ Missing error.tsx in (guest) route group
- **apps/src:** ⚠️ Deprecated - should be removed
- **Web:** ⚠️ Missing error.tsx and access-denied page

---

## 7. DYNAMIC ROUTE ANALYSIS

### 7.1 Admin Portal Dynamic Routes

| Dynamic Route | ID Validation | Error Handling | Nested Routes |
|---------------|---------------|----------------|---------------|
| `/dashboard/bookings/[id]` | Unknown | Unknown | None |
| `/dashboard/channels/[id]` | Unknown | Unknown | `/sync` |
| `/dashboard/guests/[id]` | Unknown | Unknown | `/history`, `/preferences` |
| `/dashboard/rooms/[id]` | Unknown | Unknown | None |

### 7.2 Front Office Dynamic Routes

| Dynamic Route | ID Validation | Error Handling | Nested Routes |
|---------------|---------------|----------------|---------------|
| `/dashboard/bookings/[id]` | Unknown | Unknown | `/addons`, `/check-in`, `/check-out`, `/corporate-billing`, `/extend`, `/extra-bed`, `/folios`, `/reassign` |
| `/dashboard/guests/[id]` | Unknown | Unknown | None |

### 7.3 Super Admin Dynamic Routes

| Dynamic Route | ID Validation | Error Handling | Nested Routes |
|---------------|---------------|----------------|---------------|
| `/dashboard/partners/[id]` | Unknown | Unknown | None |
| `/dashboard/properties/[id]` | Unknown | Unknown | None |
| `/dashboard/users/[id]` | Unknown | Unknown | `/properties` |

### 7.4 Guest Portal Dynamic Routes

| Dynamic Route | ID Validation | Error Handling | Nested Routes |
|---------------|---------------|----------------|---------------|
| `apps/guest-portal` - None | N/A | N/A | N/A |
| `apps/src` - `/bookings/[id]/cancel` | Unknown | Unknown | None |
| `apps/src` - `/bookings/[id]/modify` | Unknown | Unknown | None |

### 7.5 Web App Dynamic Routes

| Dynamic Route | ID Validation | Error Handling | Nested Routes |
|---------------|---------------|----------------|---------------|
| `/rooms/[id]` | Unknown | Unknown | None |
| `/bookings/[id]` | Unknown | Unknown | `/check-in`, `/check-out`, `/invoice` |

---

## 8. RECOMMENDED ROUTE STRUCTURE

### 8.1 For New Applications

```
app/
├── (auth)/
│   ├── login/page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── _components/
│   ├── dashboard/page.tsx
│   ├── bookings/
│   │   ├── page.tsx                    # List
│   │   ├── new/page.tsx                # Create
│   │   └── [id]/
│   │       ├── page.tsx                # Details
│   │       ├── edit/page.tsx           # Edit
│   │       └── history/page.tsx        # Nested
│   └── settings/
│       ├── page.tsx                    # Overview
│       ├── profile/page.tsx
│       └── security/page.tsx
├── (marketing)/                         # Optional route group
├── api/
│   ├── auth/[...nextauth]/route.ts
│   ├── bookings/
│   │   ├── route.ts                    # GET list, POST create
│   │   └── [id]/
│   │       ├── route.ts                # GET, PATCH, DELETE
│   │       └── cancel/route.ts         # Action
│   └── _lib/
│       └── validation.ts
├── access-denied/page.tsx
├── error.tsx                           # Root error boundary
├── global-error.tsx                    # For 500 errors
├── layout.tsx                          # Root layout
├── loading.tsx                         # Global loading
├── not-found.tsx                       # 404
└── offline/page.tsx                    # PWA offline
```

### 8.2 Route Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Page routes | `/kebab-case` | `/booking-history`, `/guest-profile` |
| Dynamic routes | `/[camelCaseId]` | `/bookings/[bookingId]`, `/rooms/[roomId]` |
| API routes | `/plural-nouns` | `/api/bookings`, `/api/guests` |
| Action routes | `/verb-nouns` | `/api/bookings/[id]/cancel`, `/api/rooms/[id]/clean` |
| Nested routes | Parent → Child | `/bookings/[id]/folios`, `/bookings/[id]/extend` |

### 8.3 Immediate Actions Required

1. **Remove `apps/src/` entirely** - It's a duplicate, non-functional ghost app
2. **Add missing error pages:**
   - `apps/guest-portal/src/app/(guest)/error.tsx`
   - `apps/super-admin/src/app/offline/page.tsx`
   - `apps/web/src/app/error.tsx`
   - `apps/web/src/app/access-denied/page.tsx`
3. **Fix typo** in `apps/super-admin/src/app/(super-admin)/properties//[id/]/`
4. **Standardize middleware** - Use consistent auth pattern across all apps
5. **Add callbackUrl** to front-office and guest-portal middleware redirects

---

## 9. SUMMARY

### Apps Analyzed: 6
- ✅ Admin Portal (`apps/admin/`)
- ✅ Front Office Portal (`apps/front-office/`)
- ✅ Super Admin Portal (`apps/super-admin/`)
- ✅ Guest Portal Primary (`apps/guest-portal/`)
- ⚠️ Guest Portal Secondary (`apps/src/`) - **DEPRECATED**
- ✅ Web App (`apps/web/`)

### Total Page Routes: ~150+
### Total API Routes: ~200+

### Critical Issues: 8
### High Priority Issues: 8
### Medium Priority Issues: 6
### Low Priority Issues: 4

### Primary Recommendation:
**Remove `apps/src/` completely** - it serves no purpose and creates confusion with duplicate routes. Migrate any unique routes (like `/loyalty`, `/payments`, `/check-in`) to `apps/guest-portal/` before removal.