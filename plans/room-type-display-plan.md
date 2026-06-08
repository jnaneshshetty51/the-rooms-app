# Room Type Display - Public Website Fix

## Problem
The public booking website (`apps/web`) shows all 36 individual rooms with room numbers (S101, S102, etc.). Guests should select a **room type** (STUDIO or PREMIUM), not a specific room. Room assignment happens during check-in.

## Current Flow (Wrong)
1. Guest sees 36 rooms (S101, S102, S103... P101, P102...)
2. Guest clicks on a specific room
3. Guest selects dates and books that specific room

## Correct Flow
1. Guest sees 2 room types (STUDIO, PREMIUM) with shared photos/pricing
2. Guest selects a room type
3. Guest selects dates and provides details
4. Booking is created with bookingSource = "WEBSITE" (no specific room assigned yet)
5. During check-in, front-office staff assigns a specific room

## Implementation Steps

### Step 1: Modify getRooms() to return room types
- Instead of returning all 36 individual rooms, return 2 aggregated room types
- Calculate aggregate pricing (min/max prices, or shared base price)
- Use shared/sample photos for each type
- Show vacancy count instead of individual room status

### Step 2: Update RoomCard display
- Remove roomNumber from display (or show "Room Type" instead)
- Show "STUDIO" or "PREMIUM" as the title
- Show pricing range or base price
- Show vacancy availability

### Step 3: Update room detail page /rooms/[id]
- Change to /rooms/[type] where type is "STUDIO" or "PREMIUM"
- Show detailed photos, amenities, and pricing for the room type
- Handle booking flow without room number selection

### Step 4: Update booking flow
- When booking from website, don't send roomId initially
- The booking should be created with a status that allows room assignment later
- Or alternatively, auto-assign a vacant room of the selected type during booking

## Files to Modify
1. `apps/web/src/app/(marketing)/rooms/page.tsx` - Return room types instead of individual rooms
2. `apps/web/src/app/(marketing)/rooms/[id]/page.tsx` - Show room type details
3. `apps/web/src/components/RoomCard.tsx` - Update to show room type info
4. `apps/web/src/app/(marketing)/book/details/page.tsx` - Booking flow for room types

## Key Changes
- Remove STATIC_ROOMS array that generates 36 individual rooms
- Modify `getRooms()` to return only 2 entries (STUDIO, PREMIUM)
- Use aggregate data: shared images, min/max pricing, total vacancy