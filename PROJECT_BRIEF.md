# The Rooms - Hotel Management Platform

## Project Overview
**The Rooms** is a comprehensive hotel management monorepo built with Next.js, Prisma, and PostgreSQL. It supports multiple hotel properties with role-based access for staff, guests, and super administrators.

---

## Apps

### 1. Web (`apps/web`)
Public-facing marketing and booking website.
- Room type listings with amenities
- Real-time availability checking
- Online booking flow (date selection → room type → guest details → payment)
- Razorpay payment integration
- WhatsApp floating button

### 2. Front Office (`apps/front-office`)
Day-to-day hotel operations dashboard for front desk staff.
- Room board view (visual room status)
- Walk-in booking creation with document upload
- Check-in/Check-out workflows with signature capture
- Guest management and search
- Daily reports (arrivals, departures, in-house)
- Payment recording
- Document verification

### 3. Admin (`apps/admin`)
Hotel management dashboard for administrators.
- Room management with photo uploads (MinIO storage)
- Booking management with status filters
- Revenue reports
- Maintenance alerts

### 4. Super Admin (`apps/super-admin`)
Platform-wide super administrator dashboard.
- Analytics (occupancy, booking trends, ADR)
- Financial reports with room type/booking type breakdowns
- User management (CRUD, password reset, active status)
- Audit logs with filtering
- System health monitoring
- Backup management
- Communications (alerts, templates)
- Expenses tracking
- Settings (hotel info, payments, email, storage, security)
- Properties management (multi-property support)

### 5. Guest Portal (`apps/guest-portal`)
Guest-facing self-service portal.
- Stay details view
- Add-on requests
- Complaint submission
- Extend stay requests
- Document uploads
- Invoice viewing
- Loyalty points display
- Feedback submission

---

## Key Features

### Booking System
- Online and walk-in bookings
- Daily and monthly pricing (STUDIO rooms ≥28 nights auto-switch)
- Multiple room types (STUDIO, PREMIUM)
- Extra guest charges (+₹500 for 3rd guest)
- Discount code support with validation
- Booking number format: `BKN-YYYYMMDD-XXXX`

### Payment Integration
- Razorpay for online payments
- Indusind payment gateway support
- Payment link generation
- Refund handling
- Invoice generation with PDF storage

### Document Management
- Guest ID document upload (Aadhaar, Passport, Voter ID, Driving License)
- Front/back side capture
- Document verification workflow
- Documents saved during booking creation

### Authentication
- NextAuth.js v5 with JWT strategy
- Magic link email authentication
- Role-based access (GUEST, FRONT_OFFICE, ADMIN, SUPER_ADMIN)
- Property-specific access control

### Multi-Property Support
- Property model with location/settings
- UserPropertyAccess junction table
- Property-aware queries
- Timezone and currency per property

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js v5 |
| Payments | Razorpay, Indusind, IDFC |
| Storage | MinIO (S3-compatible) |
| Email | Nodemailer |
| UI | shadcn/ui + Tailwind CSS |
| State | React Query + Zustand |
| Deployment | Docker + PM2 |

---

## Database Models
- **Room** - Individual hotel rooms with type, floor, status
- **RoomType** - Room categories with pricing
- **Booking** - Reservations with guest, room, dates, pricing
- **Guest** - Guest profiles with stay history
- **Payment** - Transaction records
- **Invoice** - Billing documents
- **GuestDocument** - ID verification documents
- **AuditLog** - Action history for compliance
- **Expense** - Operational costs
- **Property** - Hotel properties (multi-tenancy)
- **UserPropertyAccess** - User-property role mapping