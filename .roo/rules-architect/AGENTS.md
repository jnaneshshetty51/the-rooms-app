# AGENTS.md - Architect Mode

This file provides guidance to agents when making architectural decisions in this repository.

## Architecture Rules (Non-Obvious Only)

### Prisma Singleton Pattern
`packages/db/src/index.ts` exports a singleton PrismaClient. In development, the instance is stored on `globalThis` to survive HMR. Always import via `import { db } from '@the-rooms/db'`.

### Pricing Auto-Monthly Logic
STUDIO rooms with ≥28 nights automatically use monthly rates regardless of bookingType. This is in `packages/db/src/pricing.ts` `calculatePrice()`. The `isMonthly` flag in PriceBreakdown indicates this switch.

### Booking Number Generation
Booking numbers follow `BKN-YYYYMMDD-XXXX` format. Generation happens in the API route before `db.booking.create()`, not in query helpers. This ensures uniqueness and allows counting for the sequence.

### Room Status Synchronization
Booking status and room status are tightly coupled:
- CHECKED_IN booking → OCCUPIED room
- CHECKED_OUT/CANCELLED booking → VACANT room
This sync happens automatically in `updateBookingStatus()` - don't update one without the other.

### Role-Based Data Access
Each role has different data visibility:
- GUEST: sees only own bookings (by email match)
- FRONT_OFFICE: sees only bookings they created
- ADMIN/SUPER_ADMIN: sees all bookings

### Decimal Handling for Money
All monetary amounts in Prisma use `Decimal(10,2)`. Always convert to number before arithmetic: `new Decimal(amount.toNumber()).mul(nights)`. Never store floating-point.

### IDFC Payment Integration
Payment amounts must be in paise (rupees × 100). Use `toPaise()` / `fromPaise()` helpers. Webhook verification uses `verifyWebhookChecksum()`.

### Discount Validation Multi-Step
Discounts require all conditions to be true: validity dates, usage under limit, min/max nights satisfied. Don't assume a discount code is valid without checking all conditions.