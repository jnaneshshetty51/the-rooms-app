# E2E Test Suite - The Rooms Hotel Management System

## Overview

Comprehensive end-to-end Playwright tests covering all critical user flows in the hotel management system.

## Test Files

| File | Description |
|------|-------------|
| [`01-user-booking.spec.ts`](01-user-booking.spec.ts) | Public booking flow (Web app) |
| [`02-walkin-booking.spec.ts`](02-walkin-booking.spec.ts) | Walk-in booking (Front Office) |
| [`03-guest-portal.spec.ts`](03-guest-portal.spec.ts) | Guest self-service (Guest Portal) |
| [`04-checkout-flow.spec.ts`](04-checkout-flow.spec.ts) | Checkout and settlement |

## Setup

### 1. Install Dependencies

```bash
cd tests/e2e
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium --with-deps
```

### 3. Configure Environment

Create a `.env` file:

```env
BASE_URL=http://localhost:3000
FO_BASE_URL=http://fo.therooms.in
GUEST_PORTAL_URL=http://guest.therooms.in
DATABASE_URL=postgresql://user:pass@localhost:5432/the_rooms
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run headed (see browser)
npm run test:headed

# Debug mode
npm run test:debug
```

## Test Scenarios

### 1. User Booking Flow (`01-user-booking.spec.ts`)

**Happy Path:**
- Search availability → Select room → Enter details → Payment → Confirmation

**Edge Cases:**
- Same-day booking rejection
- Checkout before check-in rejection
- Invalid email format validation
- Missing required fields validation

**Failure Cases:**
- Payment failure with retry option
- Network interruption handling
- Duplicate submission prevention

### 2. Walk-in Booking Flow (`02-walkin-booking.spec.ts`)

**Happy Path:**
- Front desk login → Create booking → Upload documents → Assign room → Check-in with signature

**Edge Cases:**
- Document upload failure with retry
- Room already booked prevention
- Signature required validation

**Failure Cases:**
- Network failure during booking
- Concurrent booking modification conflict

### 3. Guest Portal Flow (`03-guest-portal.spec.ts`)

**Happy Path:**
- Magic link login → View booking → Request extension → Download invoice

**Edge Cases:**
- Expired magic link handling
- Invalid magic link error
- Extension request date validation
- Reason required validation

**Failure Cases:**
- Network failure during extension request
- Duplicate extension request prevention

### 4. Checkout Flow (`04-checkout-flow.spec.ts`)

**Happy Path:**
- Navigate to booking → Initiate checkout → Review charges → Settlement → Room release

**Edge Cases:**
- Pending payments warning
- Zero balance immediate completion
- Extra charges addition

**Failure Cases:**
- Network failure during checkout
- Concurrent checkout conflict handling
- Missing required fields validation

## Test Validations

Each test validates:

1. **UI State Consistency** - Correct elements visible after each action
2. **API Response** - Backend returns expected status codes
3. **Database State** - Records created/updated correctly
4. **Error Handling** - Graceful handling of failures

## Running Specific Tests

```bash
# Run only user booking tests
npx playwright test 01-user-booking.spec.ts

# Run only happy path tests
npx playwright test --grep "Happy"

# Run only failure tests
npx playwright test --grep "Failure"

# Run with specific browser
npx playwright test --project=chromium
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
- name: E2E Tests
  run: |
    cd tests/e2e
    npm install
    npx playwright install chromium --with-deps
    npx playwright test --reporter=html
  artifacts:
    when: always
    paths:
      - tests/e2e/playwright-report/
```

## Expected Test Count

| Test File | Tests |
|-----------|-------|
| 01-user-booking.spec.ts | 8 |
| 02-walkin-booking.spec.ts | 6 |
| 03-guest-portal.spec.ts | 8 |
| 04-checkout-flow.spec.ts | 6 |
| **Total** | **28** |

## Notes

- Tests use real database state with cleanup in `afterEach`
- Tests are isolated and can run in parallel
- Network failures simulated using `page.route()` interception
- Database state verified after critical operations