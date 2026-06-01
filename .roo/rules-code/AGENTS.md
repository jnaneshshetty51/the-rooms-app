# AGENTS.md - Code Mode

This file provides guidance to agents when working with code in this repository.

## Coding Rules (Non-Obvious Only)

### API Route Imports
API routes in `apps/*/src/app/api/` must use:
```typescript
import { ok, created, badRequest, serverError } from '@the-rooms/api';
import { db } from '@the-rooms/db';
import { createAuditLog, getClientIp } from '@the-rooms/api/middleware';
```

### Prisma Decimal Arithmetic
Always convert before math:
```typescript
// ❌ Wrong
const total = amount.multiply(nights);

// ✅ Correct
const total = new Decimal(amount.toNumber()).mul(nights);
```

### Role Check Order in API Routes
Always check GUEST first, then FRONT_OFFICE, then ADMIN/SUPER_ADMIN:
```typescript
if (userRole === 'GUEST') { /* own bookings only */ }
else if (userRole === 'FRONT_OFFICE') { /* createdById filter */ }
// ADMIN/SUPER_ADMIN see all - no filter needed
```

### Check-in/Check-out Status Transitions
When updating booking status manually, also update room status:
```typescript
// CHECKED_IN → room.status = 'OCCUPIED'
// CHECKED_OUT/CANCELLED → room.status = 'VACANT'
```

### Section Comment Style
Use Unicode box-drawing for section dividers:
```typescript
// ─── Guest Lookup ─────────────────────────────────────────────────────────
```

### IDFC Payment Amounts
Amounts passed to IDFC functions must be in **paise** (multiply rupees by 100), not rupees.

### Discount Validation
Don't assume a discount code exists and is valid - always check all conditions: validity dates, usage limit, min/max nights.

### Booking Number Generation
Format: `BKN-YYYYMMDD-XXXX`. Don't generate in query helpers - generate in API route before calling `db.booking.create()`.