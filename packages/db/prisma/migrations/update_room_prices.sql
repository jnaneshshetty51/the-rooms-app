-- Update room prices to match new pricing structure
-- Run this on both local and production databases

-- STUDIO rooms: Daily single ₹999, Daily double ₹1,799, Monthly single ₹19,999, Monthly double ₹29,999
UPDATE rooms SET 
  basePriceSingle = 999.00,
  basePriceDouble = 1799.00,
  monthlyPriceSingle = 19999.00,
  monthlyPriceDouble = 29999.00
WHERE type = 'STUDIO';

-- PREMIUM rooms: Daily single ₹1,999, Daily double ₹2,999, Monthly single ₹39,999, Monthly double ₹49,999
UPDATE rooms SET 
  basePriceSingle = 1999.00,
  basePriceDouble = 2999.00,
  monthlyPriceSingle = 39999.00,
  monthlyPriceDouble = 49999.00
WHERE type = 'PREMIUM';

-- Verify the updates
SELECT type, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble FROM rooms GROUP BY type;