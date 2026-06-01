# AGENTS.md - Debug Mode

This file provides guidance to agents when debugging in this repository.

## Debug Rules (Non-Obvious Only)

### Prisma Query Logging
In development, Prisma logs all queries to console. Check terminal output when debugging DB issues.

### Booking Status Transitions
When debugging room status issues, check `packages/db/src/queries/bookingQueries.ts` `updateBookingStatus()`. It syncs booking status to room status:
- CHECKED_IN → OCCUPIED
- CHECKED_OUT/CANCELLED → VACANT

### Payment Debugging
IDFC amounts are in paise, not rupees. If payment amounts look 100x larger/smaller, check conversion with `toPaise()` / `fromPaise()` in `packages/payments/idfc.ts`.

### Discount Validation Debugging
If discount isn't being applied, check all conditions in `calculatePrice()`:
- `isActive` flag
- `validFrom` / `validTo` date range
- `maxUses` vs `usedCount`
- `minDays` / `maxDays` night requirements

### Role-Based Filter Debugging
If users see unexpected data, check role-based filtering in API routes:
- GUEST: only sees own bookings (filtered by guest email)
- FRONT_OFFICE: only sees bookings they created (filtered by createdById)
- ADMIN/SUPER_ADMIN: see all

### Decimal Arithmetic Issues
If price calculations are wrong, ensure using `.toNumber()` before arithmetic with Decimals. Don't use `.multiply()` directly on Prisma Decimals.

### API Response Shape
All API responses follow `{ data?, error?, code?, meta? }` pattern. Check `packages/api/src/response.ts` for helpers.