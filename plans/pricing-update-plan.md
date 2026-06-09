# Pricing Update Plan

## New Pricing Structure

### DAILY (per night)
| Room Type | Single (1 guest) | Double (2 guests) | Extra guest |
|-----------|-----------------|------------------|-------------|
| STUDIO    | ₹999            | ₹1,799           | +₹500       |
| PREMIUM   | ₹1,999          | ₹2,999           | +₹500       |

### MONTHLY (per month)
| Room Type | Single (1 guest) | Double (2 guests) |
|-----------|-----------------|------------------|
| STUDIO    | ₹19,999         | ₹29,999          |
| PREMIUM   | ₹39,999         | ₹49,999          |

## Rules
1. **Extra guests** (beyond 2): +₹500 per extra guest per night (DAILY only, no extra for MONTHLY)
2. **Multiple rooms**: Multiply by number of rooms

## Implementation Steps

### 1. Update `calculatePrice()` in `packages/db/src/pricing.ts`
- Add extra guest charge logic: if `guestsCount > 2`, add ₹500 per extra guest per night (only for DAILY)
- Monthly bookings: no extra charge for additional guests

### 2. Update database room prices
Run SQL to update all STUDIO rooms:
```sql
UPDATE rooms SET basePriceSingle = 999, basePriceDouble = 1799, monthlyPriceSingle = 19999, monthlyPriceDouble = 29999 WHERE type = 'STUDIO';
```

Run SQL to update all PREMIUM rooms:
```sql
UPDATE rooms SET basePriceSingle = 1999, basePriceDouble = 2999, monthlyPriceSingle = 39999, monthlyPriceDouble = 49999 WHERE type = 'PREMIUM';
```

### 3. Multiple rooms handling
Currently a booking is for one room. Need to clarify:
- Is multiple rooms handled by creating multiple bookings?
- Or should one booking support multiple rooms?

## Files to Modify
1. `packages/db/src/pricing.ts` - add extra guest logic
2. Database - update room prices (via SQL migration)

## Testing Checklist
- [ ] Studio single daily = ₹999
- [ ] Studio double daily = ₹1,799
- [ ] Studio single monthly = ₹19,999
- [ ] Studio double monthly = ₹29,999
- [ ] Premium single daily = ₹1,999
- [ ] Premium double daily = ₹2,999
- [ ] Premium single monthly = ₹39,999
- [ ] Premium double monthly = ₹49,999
- [ ] Extra guest charge for daily (+₹500 per extra guest)
- [ ] No extra charge for extra guests on monthly
- [ ] Multiple rooms = multiplied price