# Complimentary Booking Feature Plan

## Overview
Add support for complimentary/staff bookings where rooms can be allocated without charging the guest. This applies to staff, relatives, business partners, or any other management-authorized guests.

## Requirements
1. Allow creating bookings without payment requirement
2. Track the reason/type for complimentary stays
3. Show these bookings in the room board as "OCCUPIED" but flagged differently
4. Exclude complimentary bookings from revenue calculations

## Implementation Steps

### Step 1: Add ComplimentaryType Enum to Schema
- Add `COMPLIMENTARY` to `BookingSource` enum in `packages/db/prisma/schema.prisma`
- Add optional `complimentaryReason` field to Booking model

### Step 2: Update New Booking Page
- In step 3 (Payment), add option for "Complimentary" booking
- When selected, show reason dropdown (Staff, Relative, Business Partner, Other)
- Skip payment recording for complimentary bookings
- Set payment status to "PAID" automatically (no charge)

### Step 3: Update Booking Detail Page
- Show complimentary badge and reason for complimentary bookings
- Display "Complimentary - [Reason]" instead of payment summary

### Step 4: Update Room Board
- Mark complimentary bookings with a special indicator (different color/icon)

### Step 5: Update Revenue Calculations
- Exclude complimentary bookings from revenue analytics

### Step 6: Add Audit Trail
- Log when complimentary bookings are created
- Track who authorized the complimentary stay

## Files to Modify
1. `packages/db/prisma/schema.prisma` - Add complimentaryReason field
2. `apps/front-office/src/app/(dashboard)/bookings/new/page.tsx` - Add complimentary option
3. `apps/front-office/src/app/api/bookings/route.ts` - Handle complimentary booking creation
4. `apps/front-office/src/app/(dashboard)/bookings/[id]/page.tsx` - Show complimentary info
5. `apps/front-office/src/app/api/rooms/board/route.ts` - Flag complimentary rooms
6. `apps/super-admin/src/app/api/analytics/revenue/route.ts` - Exclude from revenue