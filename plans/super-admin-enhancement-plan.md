# Super Admin Enhancement Plan

## Overview
This plan outlines the implementation of missing features for the super admin dashboard to create a comprehensive multi-property hotel management system.

## Priority Implementation Phases

---

## Phase 1: Core Infrastructure (Critical)

### 1. Property Management

**Purpose:** Enable management of multiple hotel properties from a single dashboard.

**Database Schema Changes:**
```prisma
model Property {
  id            String   @id @default(cuid())
  name          String
  code String   @unique  // e.g., "THEROOM-001"
  address       String?
  city String?
  state         String?
  country       String   @default("India")
  phone String?
  email         String?
  timezone      String   @default("Asia/Kolkata")
  currency      String   @default("INR")
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  rooms         Room[]
  users         UserPropertyAccess[]
  expenses Expense[]
  bookings      Booking[]
  staff Staff[]
}
```

**UI Pages:**
- `/super-admin/properties` - List all properties with status
- `/super-admin/properties/new` - Add new property
- `/super-admin/properties/[id]` - Property details/edit
- `/super-admin/properties/[id]/rooms` - Manage property rooms
- `/super-admin/properties/[id]/settings` - Property-specific settings

**API Routes:**
- `GET /api/properties` - List all properties
- `POST /api/properties` - Create property
- `GET /api/properties/[id]` - Get property details
- `PATCH /api/properties/[id]` - Update property
- `DELETE /api/properties/[id]` - Archive property

---

### 2. Booking Management Console

**Purpose:** Centralized view of all bookings across properties with advanced filtering and actions.

**UI Page:**
- `/super-admin/bookings` - All bookings with filters
  - Filters: property, date range, status, booking type, source, payment status
  - Columns: booking number, guest, property, room, check-in, check-out, status, amount
  - Actions: view, modify, cancel, check-in, check-out

**API Enhancement:**
- Add `propertyId` filter to existing bookings API
- Add pagination support
- Add export functionality

---

### 3. Rate Plan Management

**Purpose:** Configure pricing rules across properties.

**Database Schema:**
```prisma
model RatePlan {
  id            String   @id @default(cuid())
  name          String   // e.g., "Standard Rate", "Weekend Rate"
  description   String?
  propertyId    String?
  isGlobal Boolean  @default(false)
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  
  dailyRates    DailyRate[]
}

model DailyRate {
  id            String   @id @default(cuid())
  ratePlanId    String
  roomType String   // STUDIO, PREMIUM
  date          DateTime
  singleRate    Decimal
  doubleRate    Decimal
  extraBedRate  Decimal?
  
  ratePlan      RatePlan @relation(fields: [ratePlanId], references: [id])
}
```

**UI Pages:**
- `/super-admin/rates` - Rate plan list
- `/super-admin/rates/[id]` - Edit rate plan
- `/super-admin/rates/calendar` - Calendar view of rates

---

## Phase 2: Operations Management (Important)

### 4. Guest Loyalty Program

**Purpose:** Track and reward repeat guests across properties.

**Database Schema:**
```prisma
model LoyaltyProgram {
  id            String   @id @default(cuid())
  name          String
  description   String?
  pointsPerRs Decimal  @default(1)  // 1 point per ₹ spent
  tierNames     Json // {"bronze": 0, "silver": 5000, "gold": 15000, "platinum": 30000}
  benefits Json
  isActive      Boolean  @default(true)
}

model GuestLoyalty {
  id                String   @id @default(cuid())
  guestId           String   @unique
  programId         String
  currentTier       String   @default("bronze")
  totalPoints       Decimal  @default(0)
  availablePoints   Decimal  @default(0)
  lifetimeSpend     Decimal  @default(0)
  lastActivity DateTime
  
  guest Guest    @relation(fields: [guestId], references: [id])
  program LoyaltyProgram @relation(fields: [programId], references: [id])
  transactions      LoyaltyTransaction[]
}

model LoyaltyTransaction {
  id            String   @id @default(cuid())
  loyaltyId     String
  points        Decimal
  type          String   // EARN, REDEEM, EXPIRE, ADJUST
  description   String?
  bookingId     String?
  createdAt     DateTime @default(now())
  
  loyalty       GuestLoyalty @relation(fields: [loyaltyId], references: [id])
}
```

**UI Pages:**
- `/super-admin/loyalty` - Program overview
- `/super-admin/loyalty/members` - All loyalty members
- `/super-admin/loyalty/[id]` - Member details
- `/super-admin/loyalty/transactions` - Transaction history

---

### 5. Housekeeping Management

**Purpose:** Schedule and track housekeeping across properties.

**Database Schema:**
```prisma
model HousekeepingTask {
  id            String   @id @default(cuid())
  roomId        String
  propertyId    String
  type String   // CLEANING, MAINTENANCE, INSPECTION
  status        String   @default("PENDING") // PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  priority      String   @default("NORMAL") // LOW, NORMAL, HIGH, URGENT
  assignedTo    String?
  notes         String?
  scheduledAt   DateTime
  completedAt   DateTime?
  createdAt     DateTime @default(now())
  
  room Room     @relation(fields: [roomId], references: [id])
}
```

**UI Pages:**
- `/super-admin/housekeeping` - Task board with Kanban view
- `/super-admin/housekeeping/schedule` - Calendar scheduling
- `/super-admin/housekeeping/reports` - Performance reports

---

### 6. Maintenance Management

**Purpose:** Track room and property maintenance requests.

**Database Schema:**
```prisma
model MaintenanceRequest {
  id            String   @id @default(cuid())
  roomId        String?
  propertyId    String
  category      String   // PLUMBING, ELECTRICAL, HVAC, FURNITURE, OTHER
  priority      String   @default("NORMAL")
  status        String   @default("OPEN") // OPEN, IN_PROGRESS, RESOLVED, CLOSED
  description   String
  imageUrls     Json?
  assignedTo    String?
  resolvedAt    DateTime?
  cost Decimal?
  notes         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  room          Room?    @relation(fields: [roomId], references: [id])
}
```

**UI Pages:**
- `/super-admin/maintenance` - Request list with filters
- `/super-admin/maintenance/[id]` - Request details
- `/super-admin/maintenance/new` - Create request

---

### 7. Advanced Reporting

**Purpose:** Custom report builder and scheduled delivery.

**Database Schema:**
```prisma
model SavedReport {
  id            String   @id @default(cuid())
  name          String
  description   String?
  reportType    String   // OCCUPANCY, REVENUE, GUEST, EXPENSE, CUSTOM
  config        Json     // filters, columns, grouping
  schedule     Json?    // { frequency: "daily|weekly|monthly", emails: [] }
  lastRunAt    DateTime?
  createdBy    String
  createdAt    DateTime @default(now())
}
```

**UI Pages:**
- `/super-admin/reports` - Report templates
- `/super-admin/reports/builder` - Custom report builder
- `/super-admin/reports/scheduled` - Manage scheduled reports
- `/super-admin/reports/history` - Past report executions

---

### 8. Guest Communications

**Purpose:** Bulk messaging and automated notifications.

**Database Schema:**
```prisma
model CommunicationTemplate {
  id            String   @id @default(cuid())
  name          String
  type          String   // EMAIL, SMS, WHATSAPP
  subject       String?  // for email
  body          String
  variables     Json     // list of variable names
  isActive      Boolean  @default(true)
  createdAt DateTime @default(now())
}

model GuestCommunication {
  id            String   @id @default(cuid())
  guestId       String
  type String
  direction String   // OUTBOUND, INBOUND
  templateId    String?
  subject       String?
  body          String
  status String   // SENT, DELIVERED, FAILED, OPENED
  sentAt        DateTime @default(now())
  deliveredAt   DateTime?
  openedAt      DateTime?
  
  guest         Guest    @relation(fields: [guestId], references: [id])
}
```

**UI Pages:**
- `/super-admin/communications/templates` - Template management
- `/super-admin/communications/send` - Send bulk message
- `/super-admin/communications/history` - Message history

---

## Phase 3: Revenue& Billing (Important)

### 9. Invoice & Billing

**Purpose:** Generate invoices for corporate clients and track payments.

**Database Schema:**
```prisma
model Invoice {
  id            String   @id @default(cuid())
  invoiceNumber String   @unique
  bookingId     String?
  guestId       String
  propertyId    String
  type          String   // BOOKING, ADDON, CORRECTION
  subtotal      Decimal
  taxAmount     Decimal
  totalAmount   Decimal
  status        String   @default("DRAFT") // DRAFT, SENT, PAID, CANCELLED
  dueDate       DateTime?
  paidAt        DateTime?
  notes         String?
  createdAt     DateTime @default(now())
  
  booking       Booking? @relation(fields: [bookingId], references: [id])
  guest         Guest    @relation(fields: [guestId], references: [id])
  lineItems     InvoiceLineItem[]
}

model InvoiceLineItem {
  id            String   @id @default(cuid())
  invoiceId     String
  description   String
  quantity      Int      @default(1)
  unitPrice     Decimal
  amount        Decimal
  
  invoice       Invoice  @relation(fields: [invoiceId], references: [id])
}
```

**UI Pages:**
- `/super-admin/invoices` - Invoice list
- `/super-admin/invoices/new` - Create invoice
- `/super-admin/invoices/[id]` - View/edit invoice
- `/super-admin/invoices/[id]/pdf` - Generate PDF

---

## Implementation Sequence

```
Phase 1 (Weeks 1-4)
├── Property Management
│   ├── Database schema
│   ├── API routes
│   └── UI pages
├── Booking Console
│   ├── API enhancement
│   └── UI enhancement
└── Rate Plans
    ├── Database schema
    ├── API routes
    └── UI pages

Phase 2 (Weeks 5-8)
├── Loyalty Program
├── Housekeeping
├── Maintenance
└── Advanced Reporting

Phase 3 (Weeks 9-12)
├── Guest Communications
├── Invoice & Billing
└── Integration Framework
```

---

## Technical Notes

### Authentication & Authorization
- Properties should be added to User model via `UserPropertyAccess` junction table
- Super admins see all properties
- Property admins see only their assigned properties
- Front office users see only their property's data

### Multi-tenancy
- All queries should filter by `propertyId` where applicable
- Middleware should inject property context
- Audit logs should include propertyId

### API Response Format
```typescript
// All API responses should follow this format
{
  data: T,
  meta?: {
    total: number,
    page: number,
    perPage: number
  }
}
```

---

## Migration Strategy

1. **Add propertyId to existing tables** (rooms, bookings, expenses)
2. **Create Property table** with first property as default
3. **Migrate existing data** to first property
4. **Update all queries** to filter by propertyId
5. **Add property selector** to UI

---

## Files to Create/Modify

### New Files:
- `apps/super-admin/src/app/(super-admin)/properties/page.tsx`
- `apps/super-admin/src/app/(super-admin)/properties/[id]/page.tsx`
- `apps/super-admin/src/app/api/properties/route.ts`
- `apps/super-admin/src/app/api/properties/[id]/route.ts`
- `packages/db/src/queries/propertyQueries.ts`
- `packages/db/prisma/migrations/add_property_tables.sql`

### Modified Files:
- `packages/db/prisma/schema.prisma`
- `apps/super-admin/src/app/(super-admin)/layout.tsx` (add property selector)
- `apps/super-admin/src/middleware.ts` (property context)
- `apps/front-office/src/middleware.ts` (property context)

---

## Success Metrics

- All bookings link to a property
- All rooms link to a property
- All reports can filter by property
- Super admin can view all properties
- Property admin can only view their property
