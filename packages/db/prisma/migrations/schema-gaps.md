# Prisma Schema Gaps Analysis

## Current State vs Required State

Based on the comprehensive flow matrix, the following models and fields are missing or incomplete in the schema.

---

## Missing Models

### 1. Guest Blacklist
**Purpose:** Block bookings from problematic guests (non-payment, damage, misconduct)

```prisma
model GuestBlacklist {
  id          String   @id @default(cuid())
  guestId     String   @unique
  guest       Guest    @relation(fields: [guestId], references: [id])
  
  reason      String   // "NON_PAYMENT" | "PROPERTY_DAMAGE" | "MISCONDUCT" | "FRAUD" | "OTHER"
  description String?
  
  createdById String?
  createdBy   User?    @relation(fields: [createdById], references: [id])
  createdAt   DateTime @default(now())
  
  // Blacklist is permanent unless explicitly removed
  expiresAt   DateTime? // null = permanent
  
  @@map("guest_blacklist")
}
```

### 2. Group Booking
**Purpose:** Link multiple bookings together for group stays ( staggers check-in/out, shared billing)

```prisma
model GroupBooking {
  id              String    @id @default(cuid())
  groupCode       String    @unique // e.g., "GRP-20240529-001"
  propertyId      String    @default("default")
  property        Property  @relation(fields: [propertyId], references: [id])
  
  name            String    // Group name (company, wedding party, etc.)
  contactPerson   String?
  contactPhone    String?
  contactEmail    String?
  
  // Billing preference
  billingType     GroupBillingType @default(INDIVIDUAL)
  
  // Dates
  checkInDate     DateTime  @db.Date
  checkOutDate    DateTime  @db.Date
  
  // Status
  status          GroupBookingStatus @default(CONFIRMED)
  
  createdById      String?
  createdBy        User?     @relation(fields: [createdById], references: [id])
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  
  bookings        Booking[]
  
  @@map("group_bookings")
}

enum GroupBillingType {
  SHARED        // Single invoice for entire group
  INDIVIDUAL   // Each booking has separate invoice
  MIXED        // Some shared, some individual
}

enum GroupBookingStatus {
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}
```

### 3. Folio (Multi-Folio Support)
**Purpose:** Split bills by guest, company, or service type

```prisma
model Folio {
  id            String    @id @default(cuid())
  folioNumber   String    @unique // e.g., "FOL-20240529-001"
  bookingId     String
  booking       Booking   @relation(fields: [bookingId], references: [id])
  
  // Folio type
  type          FolioType @default(GUEST) // GUEST | COMPANY | SERVICE | SHARED
  
  // For COMPANY type
  companyName   String?
  companyGstin  String?
  
  // Description
  description   String?
  
  // Status
  isClosed      Boolean   @default(false)
  closedAt      DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  charges       FolioCharge[]
  payments      FolioPayment[]
  
  @@map("folios")
}

enum FolioType {
  GUEST       // Default - primary guest
  COMPANY     // Corporate billing
  SERVICE     // Split by service (F&B, laundry, etc.)
  SHARED      // Shared expenses split among multiple folios
}

model FolioCharge {
  id          String    @id @default(cuid())
  folioId     String
  folio       Folio     @relation(fields: [folioId], references: [id])
  
  // Charge details
  type        AddonType // from existing enum
  description String
  amount      Decimal   @db.Decimal(10, 2)
  quantity    Int       @default(1)
  chargeDate  DateTime  @db.Date
  
  // Tax
  cgst        Decimal   @db.Decimal(10, 2) @default(0)
  sgst        Decimal   @db.Decimal(10, 2) @default(0)
  totalAmount Decimal   @db.Decimal(10, 2)
  
  // Reference to original addon if converted
  addonId     String?
  
  createdAt   DateTime  @default(now())
  
  @@map("folio_charges")
}

model FolioPayment {
  id          String    @id @default(cuid())
  folioId     String
  folio       Folio     @relation(fields: [folioId], references: [id])
  paymentId   String    @unique
  payment     Payment   @relation(fields: [paymentId], references: [id])
  
  amount      Decimal   @db.Decimal(10, 2) // Amount allocated to this folio
  
  createdAt   DateTime  @default(now())
  
  @@map("folio_payments")
}
```

### 4. Advance Deposit
**Purpose:** Track advance payments separately from final payment

```prisma
model AdvanceDeposit {
  id              String    @id @default(cuid())
  bookingId       String    @unique
  booking         Booking   @relation(fields: [bookingId], references: [id])
  
  // Deposit details
  amount          Decimal   @db.Decimal(10, 2)
  paymentId       String    @unique
  payment         Payment   @relation(fields: [paymentId], references: [id])
  
  // Status
  status          DepositStatus @default(HELD) // HELD | APPLIED | REFUNDED | FORFEITED
  
  // For refund/forfeit
  refundAmount    Decimal?  @db.Decimal(10, 2)
  refundReason    String?
  processedAt     DateTime?
  processedById   String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("advance_deposits")
}

enum DepositStatus {
  HELD       // Deposit is being held
  APPLIED    // Applied to final bill
  REFUNDED   // Refunded to guest
  FORFEITED  // Kept as penalty (no-show, cancellation)
}
```

### 5. Corporate Account
**Purpose:** Corporate billing with payment terms

```prisma
model CorporateAccount {
  id              String    @id @default(cuid())
  companyName     String
  companyGstin    String?
  
  // Contact
  contactName     String?
  contactEmail    String?
  contactPhone    String?
  
  // Billing terms
  paymentTermsDays Int      @default(30) // Net days
  creditLimit     Decimal?  @db.Decimal(12, 2)
  discountPercent Decimal?  @db.Decimal(5, 2) // Corporate discount
  
  // Status
  isActive        Boolean   @default(true)
  
  // Billing address
  billingAddress  String?
  billingCity     String?
  billingState    String?
  billingPincode  String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  bookings        Booking[]
  folios          Folio[]
  
  @@map("corporate_accounts")
}
```

### 6. Room Move History
**Purpose:** Audit trail when guests change rooms

```prisma
model RoomMoveHistory {
  id              String    @id @default(cuid())
  bookingId       String
  booking         Booking   @relation(fields: [bookingId], references: [id])
  
  // Move details
  fromRoomId      String
  fromRoom        Room      @relation("MoveFromRoom", fields: [fromRoomId], references: [id])
  toRoomId        String
  toRoom          Room      @relation("MoveToRoom", fields: [toRoomId], references: [id])
  
  // Reason
  reason          RoomMoveReason
  
  // Price adjustment
  priceDiff       Decimal?  @db.Decimal(10, 2) // Positive = guest pays more
  refundAmount    Decimal?  @db.Decimal(10, 2)
  
  // Timing
  movedAt         DateTime  @default(now())
  effectiveFrom   DateTime  // When the new room becomes effective
  
  // User who initiated
  initiatedById   String?
  initiatedBy     User?     @relation(fields: [initiatedById], references: [id])
  
  notes           String?
  
  @@map("room_move_history")
}

enum RoomMoveReason {
  UPGRADE
  DOWNGRADE
  MAINTENANCE    // Room went OOO
  COMPLAINT       // Guest complained about room
  GUEST_REQUEST   // Guest asked for different room
  SYSTEM_ERROR    // Wrong room assigned initially
  OTHER
}

// Self-referencing relations for Room
// In Room model, add:
// moveHistoryFrom Room[] @relation("MoveFromRoom")
// moveHistoryTo   Room[] @relation("MoveToRoom")
```

### 7. Payment Idempotency
**Purpose:** Prevent duplicate payments on gateway timeout/retry

```prisma
model PaymentIdempotency {
  id              String    @id @default(cuid())
  idempotencyKey   String    @unique
  
  // Payment details (to detect duplicates)
  bookingId       String
  expectedAmount  Decimal   @db.Decimal(10, 2)
  paymentMethod   PaymentMethod
  
  // Result
  paymentId       String?   // Created payment if successful
  status          IdempotencyStatus @default(PENDING)
  errorMessage    String?
  
  // TTL for cleanup (24 hours)
  expiresAt       DateTime
  
  createdAt       DateTime  @default(now())
  processedAt     DateTime?
  
  @@map("payment_idempotency")
}

enum IdempotencyStatus {
  PENDING
  PROCESSED
  FAILED
  EXPIRED
}
```

### 8. Complaint Escalation
**Purpose:** Track complaint escalation levels

```prisma
model ComplaintEscalation {
  id            String    @id @default(cuid())
  complaintId   String
  complaint     Complaint @relation(fields: [complaintId], references: [id])
  
  // Escalation details
  level        EscalationLevel @default(FIRST)
  escalatedTo  String    // Manager name/ID
  reason       String?
  
  // Timing
  escalatedAt  DateTime  @default(now())
  resolvedAt   DateTime?
  
  // Resolution
  resolution   String?
  resolvedById String?
  
  @@map("complaint_escalations")
}

enum EscalationLevel {
  FIRST      // Front office manager
  SECOND     // General manager
  THIRD      // Regional/District manager
  FINAL      // Executive team
}
```

### 9. Overbooking Policy
**Purpose:** Configure overbooking behavior

```prisma
model OverbookingPolicy {
  id              String    @id @default(cuid())
  propertyId      String    @default("default")
  property        Property  @relation(fields: [propertyId], references: [id])
  
  // Enabled
  isEnabled       Boolean   @default(false)
  
  // Overbooking limits per room type
  studioOverbookLimit   Int @default(0) // Max extra bookings
  premiumOverbookLimit Int @default(0)
  
  // Waitlist settings
  enableWaitlist   Boolean   @default(true)
  waitlistTimeout  Int       @default(60) // Minutes to hold waitlist position
  
  // Resolution hierarchy
  resolutionOrder OverbookingResolution[] // ORDERED list
  
  // Partner hotel for relocation
  partnerHotelName String?
  partnerHotelContact String?
  partnerHotelRate Decimal? @db.Decimal(10, 2)
  
  updatedAt        DateTime  @updatedAt
  
  @@map("overbooking_policies")
}

enum OverbookingResolution {
  UPGRADE_FREE     // Upgrade to higher room type at no charge
  RELOCATE_PARTNER // Move to partner hotel, us pay difference
  RELOCATE_GUEST   // Move to partner hotel, guest pays
  CANCEL_REFUND    // Cancel with full refund + compensation
  CANCEL_NO_REFUND // Cancel with no refund (last resort)
}
```

### 10. Partner Hotel
**Purpose:** Partner hotels for overbooking relocation

```prisma
model PartnerHotel {
  id              String    @id @default(cuid())
  name            String
  address         String?
  city            String?
  
  // Contact
  phone           String?
  email           String?
  
  // Room types available
  roomTypes       RoomType[]
  
  // Pricing
  negotiatedRate  Decimal?  @db.Decimal(10, 2) // Our cost
  guestPays       Decimal?  @db.Decimal(10, 2) // If guest pays difference
  
  // Distance
  distanceKm      Decimal?  @db.Decimal(5, 2)
  
  // Status
  isActive        Boolean   @default(true)
  
  // Notes
  notes           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@map("partner_hotels")
}
```

---

## Missing Fields on Existing Models

### Guest Model Additions
```prisma
// Add to Guest model:
isVip          Boolean   @default(false)
isBlacklisted  Boolean   @default(false) // Quick flag (also exists in GuestBlacklist)
blacklistReason String?
```

### Booking Model Additions
```prisma
// Add to Booking model:
groupBookingId  String?   // Link to GroupBooking
folioId        String?   // Primary folio (if using multi-folio)
isOverbooking  Boolean   @default(false)

// Self-referencing for split bookings:
splitFromBookingId String?  // If this booking was split from another
splitToBookingIds   String[] // If this booking was split into multiple
```

### Room Model Additions
```prisma
// Add to Room model:
isPriorityCleaning Boolean @default(false) // VIP arrival, etc.
priorityReason     String?
```

### Payment Model Additions
```prisma
// Add to Payment model:
idempotencyKey   String?   @unique
refundId         String?   // External refund reference
appliedToDeposit Boolean   @default(false) // Linked to advance deposit
```

### Invoice Model Additions
```prisma
// Add to Invoice model:
isClosed         Boolean   @default(false)
closedAt         DateTime?
closedById       String?
editedAt         DateTime? // When last edited
editedById       String?
editReason       String?   // Why was it edited
```

### AuditLog Model Additions
```prisma
// Add to AuditLog model:
previousValue    Json?     // Previous state
newValue         Json?     // New state
entityType       String?   // "Booking" | "Room" | "Guest" for typed access
```

---

## Schema Constraints Needed

### Unique Constraints
```prisma
// Prevent double booking
@@unique([roomId, checkIn, status]) // Only for CONFIRMED/CHECKED_IN
```

### Partial Indexes (PostgreSQL)
```sql
-- Only index active bookings for availability
CREATE INDEX idx_bookings_room_active 
ON bookings(roomId, checkIn, checkOut) 
WHERE status IN ('CONFIRMED', 'CHECKED_IN');
```

### Check Constraints
```sql
-- Ensure checkout is after check-in
ALTER TABLE bookings 
ADD CONSTRAINT chk_checkout_after_checkin 
CHECK (checkOut > checkIn);

-- Ensure positive amounts
ALTER TABLE payments 
ADD CONSTRAINT chk_positive_amount 
CHECK (amount > 0);
```

---

## Migration Priority

### Phase 1: Critical (Revenue Impact)
1. GuestBlacklist - Prevent problem guests
2. PaymentIdempotency - Prevent duplicate charges
3. RoomMoveHistory - Audit trail for room changes

### Phase 2: Important (Operations)
4. GroupBooking - Group handling
5. Folio - Multi-folio billing
6. AdvanceDeposit - Deposit tracking
7. CorporateAccount - Corporate billing

### Phase 3: Enhancement (Guest Experience)
8. PartnerHotel - Overbooking relocation
9. OverbookingPolicy - Configurable overbooking
10. ComplaintEscalation - Escalation tracking
