# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Non-Obvious Patterns

### Prisma Singleton
`packages/db/src/index.ts` exports both `prisma` (default) and `db` (alias). API routes use: `import { db } from '@the-rooms/db'`

### Pricing Auto-Monthly Switch
`packages/db/src/pricing.ts` - STUDIO rooms with ≥28 nights automatically switch to monthly rate (even if bookingType is 'DAILY'). Check `isMonthly` flag in PriceBreakdown.

### Booking Status → Room Status Sync
When booking status changes to `CHECKED_IN` → room becomes `OCCUPIED`. When `CHECKED_OUT` or `CANCELLED` → room becomes `VACANT`. This happens in `packages/db/src/queries/bookingQueries.ts` `updateBookingStatus()`.

### Decimal Handling
Amounts stored as `Prisma.Decimal(10,2)` in INR. Always use `Number()` or `.toNumber()` before arithmetic. Never store floating-point directly.

### Payment Amounts (INDUSIND)
`packages/payments/indusind.ts` - INDUSIND amounts are in **paise**, not rupees. Use `toPaise()` / `fromPaise()` helpers.

### Discount Validation Multi-Condition
Discounts in `calculatePrice()` require: validity date range + under usage limit + min/max nights satisfied. Don't assume discount code is valid just because it exists.

### Role-Based Booking Filters
`apps/web/src/app/api/bookings/route.ts` - GUEST role sees only own bookings, FRONT_OFFICE sees only bookings they created, ADMIN/SUPER_ADMIN see all.

### Booking Number Format
`BKN-YYYYMMDD-XXXX` (e.g., `BKN-20240529-0001`). Generated in API route, not in query helpers.

### Invoice Number Format
`INV-YYYYMMDD-XXXX`. Generated in `packages/db/src/queries/invoiceQueries.ts` `generateInvoiceNumber()`.

## API Route Pattern
All API routes use: schema validation with zod → auth check → business logic → audit log (for mutations). Response helpers from `@the-rooms/api/response` (`ok()`, `created()`, `badRequest()`, `serverError()`).

## Comment Style
Files use section dividers: `// ─── Guest Lookup ─────────────────────────────────────────────────────────`

## No Test Framework
No test configuration found (`vitest`, `jest`, etc.). Testing not set up in this project.