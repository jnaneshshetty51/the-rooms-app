# AGENTS.md - Ask Mode

This file provides guidance to agents when explaining code in this repository.

## Documentation Context (Non-Obvious Only)

### Monorepo Structure
This is a pnpm + Turborepo monorepo with 5 Next.js apps:
- `apps/web` - public booking site (port 3000)
- `apps/guest-portal` - guest self-service (port 3001)
- `apps/front-office` - front desk operations (port 3002)
- `apps/admin` - hotel admin panel (port 3003)
- `apps/super-admin` - multi-property super admin (port 3004)

### Packages
- `packages/db` - Prisma client, queries, pricing logic
- `packages/auth` - NextAuth v5 config
- `packages/api` - response helpers, middleware
- `packages/types` - TypeScript enums/interfaces
- `packages/ui` - shared components
- `packages/email` - Resend email client
- `packages/payments` - IDFC payment gateway

### Key File Locations
- Prisma schema: `packages/db/prisma/schema.prisma`
- Pricing logic: `packages/db/src/pricing.ts`
- Room status sync: `packages/db/src/queries/bookingQueries.ts`
- API response helpers: `packages/api/src/response.ts`
- Auth config: `packages/auth/auth.config.ts`

### Booking Flow
1. Guest searches → checks availability → selects room → enters details
2. Price calculated via `calculateBookingPrice()` with GST
3. Booking created with `BKN-YYYYMMDD-XXXX` number
4. Payment initiated via IDFC (amounts in paise)
5. On CHECKED_IN, room.status → OCCUPIED
6. On CHECKED_OUT/CANCELLED, room.status → VACANT

### Room Types
STUDIO and PREMIUM. STUDIO rooms with ≥28 nights auto-switch to monthly pricing.