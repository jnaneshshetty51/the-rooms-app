# Route Architecture

## App Structure

### apps/admin/
**Purpose:** Property management dashboard  
**Route Group:** `(dashboard)`  
**Auth:** ADMIN, SUPER_ADMIN  
**Middleware Pattern:** `await auth()` with callbackUrl  
**URL Pattern:** `/admin/*`

### apps/front-office/
**Purpose:** Day-to-day operations  
**Route Group:** `(dashboard)`  
**Auth:** FRONT_OFFICE, ADMIN, SUPER_ADMIN  
**Middleware Pattern:** Callback pattern with callbackUrl  
**URL Pattern:** `/front-office/*`

### apps/guest-portal/
**Purpose:** Guest self-service  
**Route Group:** `(guest)`  
**Auth:** GUEST (via magic link)  
**Middleware Pattern:** Callback pattern with callbackUrl  
**URL Pattern:** `/guest/*`

### apps/super-admin/
**Purpose:** Multi-property management  
**Route Group:** `(super-admin)`  
**Auth:** SUPER_ADMIN only  
**Middleware Pattern:** `await auth()` with callbackUrl  
**URL Pattern:** `/super-admin/*`

### apps/web/
**Purpose:** Public booking site  
**Route Groups:** Marketing `(marketing)`, Booking `(booking)`  
**Auth:** Public  
**URL Pattern:** `/`, `/rooms`, `/book`, etc.

---

## Clean URLs

| Portal | URL Pattern | Auth |
|--------|-------------|------|
| Admin | `/admin/dashboard`, `/admin/bookings`, etc. | ADMIN, SUPER_ADMIN |
| Front Office | `/front-office/dashboard`, `/front-office/bookings`, etc. | FRONT_OFFICE, ADMIN, SUPER_ADMIN |
| Guest | `/guest/dashboard`, `/guest/bookings`, etc. | GUEST |
| Super Admin | `/super-admin/dashboard`, `/super-admin/users`, etc. | SUPER_ADMIN |
| Web | `/`, `/rooms`, `/book`, etc. | Public |

---

## Middleware Patterns

### Pattern 1: `await auth()` (admin, super-admin)
```typescript
export async function middleware(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", encodeURIComponent(request.url))
    return NextResponse.redirect(loginUrl)
  }
  // ...
}
```

### Pattern 2: Callback Pattern (front-office, guest-portal)
```typescript
export default auth((req: any) => {
  const isLoggedIn = !!req.auth;
  // ...
  if (isProtectedRoute && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', encodeURIComponent(req.url));
    return NextResponse.redirect(loginUrl);
  }
  // ...
})
```

---

## API Route Locations

### apps/guest-portal/src/app/api/
| Route | Purpose |
|-------|---------|
| `/api/addons` | Guest add-ons |
| `/api/auth/[...nextauth]` | Authentication |
| `/api/auth/change-password` | Password change |
| `/api/auth/forgot-password` | Forgot password |
| `/api/auth/magic-link` | Magic link auth |
| `/api/auth/reset-password` | Password reset |
| `/api/bookings` | Guest bookings |
| `/api/bookings/[id]/cancel` | Cancel booking |
| `/api/bookings/[id]/express-checkout` | Express checkout |
| `/api/bookings/[id]/stay-modification` | Stay modification (NEW) |
| `/api/complaints` | Guest complaints |
| `/api/documents` | Guest documents |
| `/api/extend-stay` | Extend stay requests |
| `/api/feedback` | Guest feedback |
| `/api/guest-checkin` | Guest check-in (NEW) |
| `/api/invoices` | Guest invoices |
| `/api/loyalty` | Loyalty program |
| `/api/payments` | Guest payments |
| `/api/profile` | Guest profile |
| `/api/settings` | Guest settings |
| `/api/stats` | Dashboard stats |

### apps/admin/src/app/api/
| Route | Purpose |
|-------|---------|
| `/api/bookings` | Booking management |
| `/api/rooms` | Room management |
| `/api/channels` | OTA channel sync |
| `/api/discount-approvals` | Discount approvals |
| `/api/documents` | Document verification |
| `/api/expenses` | Expense tracking |
| `/api/guests` | Guest management |
| `/api/invoices` | Invoice management |
| `/api/maintenance` | Maintenance requests |
| `/api/night-audit` | Night audit |
| `/api/payments` | Payment management |
| `/api/reports/*` | Various reports |
| `/api/staff/*` | Staff management |

### apps/front-office/src/app/api/
| Route | Purpose |
|-------|---------|
| `/api/bookings` | Booking management |
| `/api/guests` | Guest lookup |
| `/api/rooms` | Room operations |
| `/api/discount-approvals` | Discount approvals |
| `/api/night-audit` | Night audit |
| `/api/shifts/*` | Staff shifts |
| `/api/offline/*` | Offline sync |
| `/api/reports/*` | Reports |
| `/api/notifications/*` | Guest notifications |

### apps/super-admin/src/app/api/
| Route | Purpose |
|-------|---------|
| `/api/analytics/*` | Analytics dashboards |
| `/api/audit-logs` | Audit logging |
| `/api/backups` | Database backups |
| `/api/partners` | Partner management |
| `/api/properties` | Property management |
| `/api/users` | User management |
| `/api/settings` | System settings |

---

## Offline Pages

All apps have offline fallback pages for PWA functionality:

- `apps/admin/src/app/offline/page.tsx` ✓
- `apps/front-office/src/app/offline/page.tsx` ✓
- `apps/guest-portal/src/app/offline/page.tsx` ✓
- `apps/super-admin/src/app/offline/page.tsx` ✓

---

## Navigation Structure

### Guest Portal Bottom Navigation
Located: `apps/guest-portal/src/components/navigation/BottomTabNav.tsx`

| Label | Route | Icon |
|-------|-------|------|
| Home | `/dashboard` | Home |
| Bookings | `/bookings` | CalendarDays |
| Payments | `/payments` | FileText |
| Profile | `/profile` | User |
| Settings | `/settings` | Settings |

### Guest Portal Footer
Located: `apps/guest-portal/src/components/layout/GuestPortalFooter.tsx`

Quick Links: Dashboard, My Bookings, Documents  
Support: Raise Issue, Share Feedback, Contact Us