# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**The Rooms** is a hotel management platform built as a pnpm + Turborepo monorepo. It runs five separate Next.js 15 apps backed by a shared PostgreSQL database (via Prisma), with Redis and MinIO for caching and file storage.

## Commands

```bash
# Install dependencies
pnpm install

# Dev — all apps simultaneously
pnpm dev

# Dev — individual apps (each runs on its own port)
pnpm dev:web           # :3000 — public booking site
pnpm dev:guest         # :3001 — guest self-service portal
pnpm dev:front-office  # :3002 — front-desk operations
pnpm dev:admin         # :3003 — hotel admin panel
pnpm dev:super-admin   # :3004 — multi-property super admin

# Build
pnpm build             # all apps
pnpm build:web         # single app

# Type check
pnpm typecheck

# Lint
pnpm lint

# Database (all run against packages/db via Prisma)
pnpm db:migrate        # run pending migrations
pnpm db:push           # push schema without migration (dev only)
pnpm db:seed           # seed initial data

# Docker (starts Postgres, Redis, MinIO)
pnpm docker:up
pnpm docker:down
pnpm docker:logs

# Create a user (admin utility)
DATABASE_URL=... npx tsx packages/auth/scripts/create-user.ts \
  --email "user@example.com" --name "John Doe" --role ADMIN --password "Pass@123"
```

**No test framework is configured** — `vitest`/`jest` are not set up.

## Architecture

### Monorepo layout

```
apps/
  web/            Public-facing hotel booking site (port 3000)
  guest-portal/   Logged-in guest self-service (port 3001)
  front-office/   Front-desk operations: check-in/out, new bookings, room board (port 3002)
  admin/          Hotel admin: rooms, users, reports, discounts (port 3003)
  super-admin/    Cross-property analytics and system health (port 3004)

packages/
  db/             Prisma client + all query helpers + pricing logic
  auth/           NextAuth v5 shared config (credentials provider, JWT callbacks)
  api/            Shared API route utilities (response helpers, withAuth middleware)
  types/          Shared TypeScript enums and interfaces
  ui/             Shared component library (shadcn/ui base + hotel-specific components)
  email/          Resend email client + typed send functions
  payments/       INDUSIND Bank payment gateway wrapper
```

### Data layer (`packages/db`)

Single Prisma schema at `packages/db/prisma/schema.prisma`. `packages/db/src/index.ts` exports both `prisma` (default) and `db` (alias) — API routes use `import { db } from '@the-rooms/db'`. All named query helpers are re-exported from that same index (`createBooking`, `getAllRooms`, `generateInvoice`, etc.).

Key models: `User`, `Guest`, `Room`, `Booking`, `Payment`, `Invoice`, `Discount`, `Amenity`, `Complaint`, `GuestDocument`, `AuditLog`, `Expense`.

Room types: `STUDIO` | `PREMIUM`. Booking types: `DAILY` | `MONTHLY`. Amounts stored as `Decimal(10,2)` in INR — always call `.toNumber()` before arithmetic, never store raw floats.

Pricing lives in `packages/db/src/pricing.ts`. It returns a `PriceBreakdown` with full GST at 18% (9% CGST + 9% SGST). Monthly rates apply only when `bookingType === 'MONTHLY'` **and** nights ≥ 28 **and** the room is `STUDIO` — all three conditions must be true. Check the `isMonthly` flag on the returned breakdown. `calculateBookingPrice` is an alias for `calculatePrice`; both are exported from `@the-rooms/db`.

Booking status changes trigger room status sync inside `updateBookingStatus()` in `packages/db/src/queries/bookingQueries.ts`: `CHECKED_IN` → room `OCCUPIED`; `CHECKED_OUT` or `CANCELLED` → room `VACANT`.

### Auth (`packages/auth`)

NextAuth v5, credentials-only. Accounts lock after 5 failed attempts (`user.attempts`). JWT sessions expire in 24h. The shared `authConfig` from `@the-rooms/auth/config` is consumed by each app's `[...nextauth]` route.

Each app's `middleware.ts` enforces role access:
- `web` — public (no auth required for browsing)
- `guest-portal` — requires any authenticated session; role is not strictly enforced in middleware (but API routes scope data to GUEST)
- `front-office` — blocks `GUEST` role; any other authenticated role is admitted (middleware does not enforce FRONT_OFFICE-specifically)
- `admin` — ADMIN or SUPER_ADMIN
- `super-admin` — SUPER_ADMIN only

**Magic link is simulated** — the guest portal login passes `isMagicLink: "true"` as a credentials field directly to `signIn()`. No actual email is dispatched; the `authConfig` authorizer detects this flag and authenticates the GUEST user without a password. This is a dev-mode shortcut: a real implementation would verify a token from the email.

Note: each app has both `apps/<app>/middleware.ts` (root-level, legacy position) and `apps/<app>/src/middleware.ts`. The `src/` versions are the active ones for Next.js App Router.

### API routes pattern

All API routes live at `apps/<app>/src/app/api/`. Standard flow: **zod validation → auth check → business logic → audit log** (for mutations).

Use helpers from `@the-rooms/api`:
- `ok()`, `created()`, `notFound()`, `badRequest()`, `unauthorized()`, `serverError()`, `paginated()` from `@the-rooms/api/response`
- `withAuth(request, allowedRoles)` or `withAuthHandler(handler, allowedRoles)` from `@the-rooms/api/middleware`
- `parseBody(request, zodSchema)` from `@the-rooms/api/middleware` for JSON parsing + validation
- `createAuditLog()` from `@the-rooms/api/middleware` for sensitive mutations

Role-based data scoping: GUEST sees only own bookings; FRONT_OFFICE sees only bookings they created; ADMIN/SUPER_ADMIN see all.

**Availability API** (`GET /api/availability`) is public (no auth). Query params: `checkIn`, `checkOut`, `guestsCount`, `type` (`STUDIO` | `PREMIUM` | `MONTHLY`). Passing `type=MONTHLY` filters to STUDIO rooms only — it is not a separate room type in the DB schema.

### UI (`packages/ui`)

Built on shadcn/ui + Tailwind. Exports UI primitives, layout shells (`AppShell`, `PortalSidebar`), hotel-domain components (`RoomCard`, `BookingStatusTimeline`, `PaymentSummary`), and utilities (`cn`, `formatCurrency`, `formatDate`). All apps import from `@the-rooms/ui`.

### Email (`packages/email`)

Resend-based. Typed send functions in `packages/email/send.ts`: `sendBookingConfirmation`, `sendCheckInReminder`, `sendCheckOutReminder`, `sendPaymentSuccess`, `sendInvoice`, `sendGuestComplaint`, `sendExtendStayRequest`. React email templates live in `packages/email/templates/`.

### Payments (`packages/payments`)

INDUSIND Bank gateway. Use `getINDUSINDClient()` singleton, `initiatePayment()`, `checkPaymentStatus()`, `refundPayment()`. **Amounts are in paise** — use `toPaise()` / `fromPaise()` helpers. Verify webhooks with `verifyWebhookChecksum()`.

## Non-obvious patterns

**Booking number format:** `BKN-YYYYMMDD-XXXX` — generated in the API route, not in `createBooking()`.

**Invoice number format:** `INV-YYYYMMDD-XXXX` — generated by `generateInvoiceNumber()` in `packages/db/src/queries/invoiceQueries.ts`.

**Discount validation** requires all four conditions simultaneously: date range valid + under `maxUses` + `minDays` satisfied + `maxDays` not exceeded. A code existing in the DB does not mean it's applicable.

**Legal/policy pages** live at `apps/web/src/app/(marketing)/cancellation/`, `/privacy/`, and `/terms/` — they are part of the public marketing route group.

**Comment style** — files use Unicode box-drawing section dividers:
```ts
// ─── Section Name ──────────────────────────────────────────────────────────
```

## Infrastructure

Production: Hostinger VPS (Ubuntu 22.04). PM2 manages all 5 Next.js apps (`ecosystem.config.js`). Nginx reverse-proxies subdomains. PostgreSQL, Redis, and MinIO run in Docker. SSL via Certbot.

Subdomains: `therooms.in` → web, `my.therooms.in` → guest portal, `fo.therooms.in` → front office, `admin.therooms.in` → admin, `superadmin.therooms.in` → super admin.
