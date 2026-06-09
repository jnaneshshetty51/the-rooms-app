# Test Coverage Report - The Rooms Hotel Management System

## Executive Summary

This report identifies comprehensive test coverage for the hotel management system, including unit tests for business logic and identification of areas requiring additional testing.

---

## Current Test Setup

### Infrastructure
- **Framework**: Vitest 4.1.8
- **Location**: `packages/db/src/`
- **Configuration**: `packages/db/vitest.config.ts`

### Test Files Created
1. `packages/db/src/pricing.test.ts` - Pricing logic tests
2. `packages/db/src/queries/bookingQueries.test.ts` - Booking query tests

### Run Commands
```bash
npm test        # Run tests in watch mode
npm run test:run # Run tests once
npm run test:coverage # Run with coverage report
```

---

## Test Coverage by Module

### ✅ Pricing Logic (`packages/db/src/pricing.ts`)

| Test Category | Status | Test Count |
|--------------|--------|------------|
| Daily Pricing (Happy Path) | ✅ Complete | 3 |
| Monthly Pricing (Happy Path) | ✅ Complete | 4 |
| Extra Guest Charges | ✅ Complete | 5 |
| Discount Validation | ✅ Complete | 9 |
| Failure Cases | ✅ Complete | 3 |
| Format INR | ✅ Complete | 3 |

**Total: 27 tests**

**Key Scenarios Covered:**
- Single/double occupancy pricing
- GST calculation (18% split into 9% CGST + 9% SGST)
- Monthly rate auto-switch for STUDIO ≥28 nights
- +₹500/night extra guest charge (guests > 2)
- Discount code validation (isActive, date range, usage limit, min/max nights)
- Room not found error handling
- Same-day check-in/check-out handling

---

### ✅ Booking Queries (`packages/db/src/queries/bookingQueries.ts`)

| Test Category | Status | Test Count |
|--------------|--------|------------|
| Room Availability (Happy Path) | ✅ Complete | 2 |
| Date Overlap Logic | ✅ Complete | 7 |
| Booking Number Generation | ✅ Complete | 3 |
| Booking Number Edge Cases | ✅ Complete | 3 |
| Status Transitions | ✅ Complete | 5 |
| Failure Cases | ✅ Complete | 2 |
| getBookingsByDate | ✅ Complete | 2 |

**Total: 24 tests**

**Key Scenarios Covered:**
- No-conflict availability check
- Date overlap detection (all scenarios)
- Back-to-back booking handling (checkout day is free)
- Booking number format `BKN-YYYYMMDD-XXXX`
- Counter increment and padding
- CHECKED_IN → OCCUPIED transition
- CHECKED_OUT/CANCELLED → VACANT transition
- checkInTime/checkOutTime setting

---

## Missing Test Coverage Areas

### 🔴 High Priority - Needs Testing

#### 1. Payment Processing (`packages/payments/`)
- Razorpay payment signature verification
- Payment status transitions (PENDING → COMPLETED/FAILED/REFUNDED)
- Refund handling
- Payment link generation

#### 2. Auth Module (`packages/auth/`)
- JWT token generation/verification
- Magic link token validation
- Session management
- Role-based access control

#### 3. Invoice Generation (`packages/db/src/queries/invoiceQueries.ts`)
- Invoice number generation (`INV-YYYYMMDD-XXXX`)
- PDF URL updates
- Invoice retrieval by booking

#### 4. Document Upload (`packages/db/src/queries/guestQueries.ts`)
- Document upload to MinIO
- Document verification workflow
- Guest document retrieval

### 🟡 Medium Priority - Recommended

#### 5. API Route Handlers (Integration Tests)
- `apps/web/src/app/api/availability/route.ts`
- `apps/web/src/app/api/bookings/route.ts`
- `apps/front-office/src/app/api/bookings/route.ts`
- `apps/front-office/src/app/api/bookings/[id]/check-in/route.ts`
- `apps/front-office/src/app/api/bookings/[id]/check-out/route.ts`

#### 6. Guest Queries
- Guest search functionality
- Guest creation
- Complaint creation
- Extend stay request
- Addon request

### 🟢 Low Priority - Nice to Have

#### 7. Room Queries
- Room availability checking
- Room status bulk updates
- Room type filtering

---

## Logic Improvements for Testability

### 1. Extract Date Overlap Logic
**Current Issue**: Date overlap logic is embedded in `isRoomAvailable()`

**Recommendation**: Extract to pure function:
```typescript
export function hasDateOverlap(
  checkIn1: Date, checkOut1: Date,
  checkIn2: Date, checkOut2: Date
): boolean {
  return checkIn1 < checkOut2 && checkOut1 > checkIn2;
}
```

### 2. Extract Pricing Constants
**Current Issue**: GST_RATE, EXTRA_GUEST_RATE are hardcoded

**Recommendation**: Move to config:
```typescript
export const PRICING_CONFIG = {
  GST_RATE: 0.18,
  EXTRA_GUEST_RATE_DAILY: 500,
  MONTHLY_THRESHOLD_NIGHTS: 28,
} as const;
```

### 3. Decimal Handling
**Current Issue**: `toNumber()` called multiple times

**Recommendation**: Create helper:
```typescript
export function toNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}
```

### 4. Room Availability Race Condition
**Current Issue**: `isRoomAvailable()` and booking creation are not atomic

**Recommendation**: Use `SELECT FOR UPDATE` or transaction with row-level locking to prevent double-booking under concurrency.

---

## Recommended Test Data

### Room Types
```typescript
const STUDIO_SINGLE = { type: 'STUDIO', basePriceSingle: 2500, basePriceDouble: 3500, monthlyPriceSingle: 55000, monthlyPriceDouble: 65000 };
const PREMIUM_SINGLE = { type: 'PREMIUM', basePriceSingle: 4500, basePriceDouble: 5500, monthlyPriceSingle: 90000, monthlyPriceDouble: 110000 };
```

### Booking Scenarios
```typescript
const SCENARIOS = {
  SINGLE_NIGHT: { checkIn: '2024-06-01', checkOut: '2024-06-02', nights: 1 },
  WEEKEND: { checkIn: '2024-06-01', checkOut: '2024-06-03', nights: 2 },
  WEEK: { checkIn: '2024-06-01', checkOut: '2024-06-08', nights: 7 },
  MONTHLY: { checkIn: '2024-06-01', checkOut: '2024-06-29', nights: 28 },
};
```

### Discount Codes
```typescript
const VALID_DISCOUNT = { code: 'SAVE10', discountPercent: 10, isActive: true, validFrom: '2024-01-01', validTo: '2025-12-31', maxUses: 100, usedCount: 50, minDays: 1, maxDays: null };
const EXPIRED_DISCOUNT = { ...VALID_DISCOUNT, validTo: '2023-12-31' };
const EXHAUSTED_DISCOUNT = { ...VALID_DISCOUNT, maxUses: 100, usedCount: 100 };
```

---

## Running Tests

```bash
# Navigate to db package
cd packages/db

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/pricing.test.ts

# Run tests matching pattern
npx vitest run --grep "Extra Guest"
```

---

## Next Steps

1. **Immediate**: Run `npm run test:coverage` to establish baseline
2. **Short-term**: Add payment processing tests
3. **Medium-term**: Add API integration tests with supertest
4. **Long-term**: Set up CI/CD pipeline with test execution