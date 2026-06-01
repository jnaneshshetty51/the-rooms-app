# The Rooms — Complete Implementation Checklist Suite
## All 5 Checklists: Master + 4 Dashboards + SEO Verification

---

## HOW TO USE THIS DOCUMENT

This checklist suite verifies the complete The Rooms Hotel Management System. Each section has:
- ✅ = Verified & Complete
- ⚠️ = In Progress / Partial
- ❌ = Missing / Not Yet Implemented
- 📝 = Note / Context

**Execution order:** Complete prompts #001–#055 first, then use these checklists in order:
1. Master Integration Checklist (complete system verification)
2. Front Office Dashboard Checklist (fo.therooms.in)
3. Admin Dashboard Checklist (admin.therooms.in)
4. Guest Portal Checklist (my.therooms.in)
5. Super Admin Dashboard Checklist (superadmin.therooms.in)
6. SEO Verification Checklist (therooms.in public website)

---

# CHECKLIST 1: MASTER INTEGRATION CHECKLIST
## Complete System Verification — After All Prompts Completed

### Section A: Database & Storage
```
□ □ □ Prisma schema created with all models
     → users (id, email, passwordHash, role, isActive, attempts)
     → guests (name, phone, email, alternatePhone, address, dateOfBirth, companyName, notes, stayCount, loyaltyTier)
     → rooms (id, roomNumber, type, floor, status, basePriceSingle, basePriceDouble, monthlyPriceSingle, monthlyPriceDouble, maxOccupancy)
     → room_photos (id, roomId, url, caption, sortOrder)
     → amenities (name, icon, category)
     → room_amenities (junction table)
     → bookings (id, bookingNumber, guestId, roomId, checkIn, checkOut, guestsCount, bookingType, bookingSource, status, paymentStatus, baseAmount, discountAmount, extrasAmount, totalAmount, specialRequests, discountCode, createdById)
     → guest_documents (id, guestId, bookingId, documentType, frontUrl, backUrl, verified)
     → payments (id, bookingId, amount, method, transactionId, gatewayRef, status)
     → invoices (id, bookingId, paymentId, invoiceNumber, pdfUrl, issuedAt)
     → discounts (id, name, code, type, discountPercent, minDays, maxDays, validFrom, validTo, maxUses, usedCount, isActive)
     → announcements (id, title, body, imageUrl, linkUrl, linkLabel, activeFrom, activeTo, priority, createdById)
     → complaints (id, bookingId, subject, description, status, imageUrl, resolvedAt, createdAt)
     → audit_logs (id, userId, action, entity, entityId, metadata, ipAddress, createdAt)

□ □ □ Database indexes created:
     → guests.phone, guests.email (search optimization)
     → bookings.checkIn, bookings.checkOut (date range queries)
     → bookings.status (filter optimization)
     → bookings.guestId (guest history)
     → audit_logs.userId, entity+entityId (audit queries)

□ □ □ PostgreSQL 16 running and accessible on VPS
     → Connection string: postgresql://user:pass@localhost:5432/the_rooms
     → Connection pooling: max 20 connections, timeout 30s
     → Backup: pg_dump running daily at 2 AM IST

□ □ □ MinIO running with 5 buckets:
     → rooms-photos (public-read, unlimited)
     → guest-documents (private, 90-day auto-delete)
     → invoices (private, 365-day retention)
     → receipts (private)
     → announcements (public-read)

□ □ □ MinIO lifecycle rules configured per bucket
□ □ □ Database seed run: 18 Studio rooms (S101–S118), 18 Premium rooms (P101–P118)
□ □ □ Seed: 15 default amenities with icons
□ □ □ Seed: 1 Super Admin user (superadmin@therooms.in)
□ □ □ Seed: at least 1 sample announcement for carousel
□ □ □ Connection from Next.js apps to PostgreSQL verified
□ □ □ MinIO DNS: minio.therooms.in configured (or port 9000 directly)
```

### Section B: Authentication & Authorization
```
□ □ □ NextAuth.js v5 configured in all 5 apps (web, guest-portal, fo, admin, super-admin)
□ □ □ Independent NEXTAUTH_SECRET per app (verify each is unique)
□ □ □ Independent NEXTAUTH_URL per app (correct subdomain per app)
□ □ □ JWT sessions with role embedded in token
□ □ □ Session persists to Redis (stateless server deployments)
□ □ □ Session expiry: 24h for FO/Admin/Super Admin, 30 days for Guest
□ □ □ GUEST role can access: my.therooms.in, public booking flow
□ □ □ FRONT_OFFICE role scoped to: fo.therooms.in only
□ □ □ ADMIN role scoped to: admin.therooms.in only
□ □ □ SUPER_ADMIN role scoped to: superadmin.therooms.in only
□ □ □ Magic link password reset working via Resend (15-min expiry)
□ □ □ Account lockout: 5 failed attempts → 15-minute lock
□ □ □ Rate limiting on /api/auth/login: max 5 attempts / 15 minutes
□ □ □ CSRF protection enabled
□ □ □ Secure cookies: HttpOnly, SameSite=Strict in production
□ □ □ Password strength indicator on reset-password forms
□ □ □ New staff accounts: require password change on first login
□ □ □ Session force-logout: "Sign out all other sessions" per user
```

### Section C: Public Website (therooms.in)
```
□ □ □ Landing page / (hero carousel ✅, quick booking widget ✅, about section ✅)
□ □ □ Quick booking widget: sticky on scroll, functional date → room selection
□ □ □ Rooms listing /rooms: grid of all 36 rooms, filters, grid/list toggle
□ □ □ Room detail /rooms/[id]: 36 unique pages, photo gallery, pricing sidebar
□ □ □ Photo gallery: horizontal scroll + lightbox + zoom + swipe
□ □ □ Pricing page /pricing: daily table + monthly table + discount cards + calculator
□ □ □ Amenities page /amenities: 6 categories, icons, grouped layout
□ □ □ Contact page /contact: form, Google Maps embed, WhatsApp link
□ □ □ FAQ page /faq: accordion-style with 10+ questions
□ □ □ Booking flow /book (5 steps):
     → Step 1: date selection with today-pre-filled + guests toggle
     → Step 2: available rooms grid (real-time availability)
     → Step 3: guest details form + extras
     → Step 4: payment (IDFC hosted page)
     → Step 5: confirmation page + booking ID + email trigger

□ □ □ Real-time availability API: overlap logic checked (booking.conflict check)
□ □ □ IDFC payment integration for UPI/Card/Net Banking
□ □ □ Booking confirmation email triggered on payment success
□ □ □ Guest account auto-created after first booking (magic link sent)
□ □ □ Hero carousel: auto-rotates (4s), pause on hover, swipe on mobile
□ □ □ SEO: sitemap.xml, robots.txt, JSON-LD (Hotel + HotelRoom + ItemList)
□ □ □ SEO metadata: title, description, OG image on every page
□ □ □ PWA: service worker, offline fallback, add-to-homescreen
□ □ □ PWA: add-to-homescreen prompt (shown after 3s + 20% scroll)
□ □ □ Multi-language toggle: EN/HI in header (client-side, no reload)
□ □ □ Mobile responsive: 320px, 375px, 768px tested
□ □ □ No placeholder text left ("Lorem ipsum" → removed from all pages)
□ □ □ 404 page: custom not-found.tsx page (not browser default)
□ □ □ Greeting/message footer: "© 2026 The Rooms. All rights reserved. GST: [NUMBER]"
```

### Section D: Guest Portal (my.therooms.in)
```
□ □ □ Login with magic link (email-only, no password)
□ □ □ Dashboard: "Good [Morning/Afternoon/Evening], [Name]" greeting
□ □ □ Upcoming stay card: countdown "X days to go", room, dates
□ □ □ Loyalty tier display: Bronze/Silver/Gold with next tier progress
□ □ □ Quick actions: Upload Documents ✅, Raise Complaint ✅, Extend Stay ✅
□ □ □ Recent bookings: last 3 with "View All" link
□ □ □ Booking list: tabs — Upcoming | Past | Cancelled
□ □ □ Booking card: room type badge, dates, status badge, amount
□ □ □ Booking detail: booking number, status timeline, room info, payment breakdown
□ □ □ Booking detail: "Download Invoice" → PDF from MinIO
□ □ □ Booking detail: "Cancel Booking" with cancellation policy + confirmation
□ □ □ Document upload: camera capture (mobile), file upload (desktop)
□ □ □ Document upload: front + back photo with progress bar
□ □ □ Document upload: "Documents uploaded. Front desk will verify upon arrival." message
□ □ □ Complaint submission: subject dropdown, description, photo (up to 3)
□ □ □ Complaint: "Urgent" checkbox → high priority
□ □ □ Extend Stay: date picker for new checkout, price recalculation
□ □ □ Extend Stay: "Requested — Awaiting Front Office Approval" status shown
□ □ □ Post-stay feedback: star rating, review text, anonymous toggle
□ □ □ Profile: name, phone, email editable + password change
□ □ □ Bottom tab nav: Dashboard | Bookings | Documents | Profile
□ □ □ Mobile: every element tap target ≥ 44×44px
□ □ □ Footer: footer consistent with brand
□ □ □ Notifications: bell icon (if in-app push implemented)
□ □ □ Booking not found: 404 not-found.tsx page
```

### Section E: Front Office Portal (fo.therooms.in)
```
□ □ □ Login via email + password (subdomain-specific login page)
□ □ □ Dashboard: today's arrivals count + names list
□ □ □ Dashboard: today's departures count + names list
□ □ □ Dashboard: "In-House: X/36 rooms" with percentage
□ □ □ Dashboard: Revenue Today: ₹X,XXX (verified against Payment records)
□ □ □ Dashboard: quick action bar (Walk-In | Check-In | Check-Out | Rooms)
□ □ □ Room availability board: 36-room color-coded grid (VACANT/OCCUPIED/MAINTENANCE/BLOCKED)
□ □ □ Room board: click room → quick action panel (right panel / bottom sheet)
□ □ □ Room board: filter by type (Studio/Premium/All)
□ □ □ Room board: date picker for future availability view
□ □ □ Room board: auto-refresh every 30 seconds + manual refresh
□ □ □ Walk-in booking: 4-step flow (dates/room → guest → docs → payment)
□ □ □ Walk-in: advance search → existing guest auto-fill
□ □ □ Walk-in: camera capture for document front + back
□ □ □ Walk-in: cash payment → receipt + completed ✅
□ □ □ Walk-in: UPI/Card → payment link sent → status updated on payment
□ □ □ Check-In: search by booking ID → booking loads ✅
□ □ □ Check-In: booking details shown (guest name, room, dates, payment status)
□ □ □ Check-In: document thumbnail preview with verify buttons
□ □ □ Check-In: digital signature canvas (sign on screen)
□ □ □ Check-In: "Complete Check-In" → room status OCCUPIED ✅
□ □ □ Check-Out: final bill auto-calculated (base × nights + extras - discount)
□ □ □ Check-Out: add charges (extra service, late checkout fee)
□ □ □ Check-Out: cash + UPI/Card payment modes
□ □ □ Check-Out: "Complete Check-Out" → room status VACANT + invoice emailed ✅
□ □ □ Guest search: by name, phone, booking ID
□ □ □ Extend stay: modify check-out date and recalculate
□ □ □ Extend stay: notify FO via email + WhatsApp
□ □ □ Complaint queue: kanban (OPEN | IN_PROGRESS | RESOLVED)
□ □ □ Daily report: Revenue | Arrivals | Departures | Occupancy
□ □ □ Daily report: cash vs online breakdown, arrivals/departures list
□ □ □ Night Audit: EOD close button + transaction locking
□ □ □ Night Audit: email report sent to admin + super admin
□ □ □ WhatsApp notifications: booking confirmed, check-in reminder sent to guests
□ □ □ Offline mode: PWA with service worker caches app shell
□ □ □ Offline: queue check-ins when offline → sync when back online
□ □ □ Dark mode toggle: works correctly (if implemented)
□ □ □ Pinch-to-zoom on room board (mobile)
□ □ □ "Print View" on room board: thermal printer compatible output
□ □ □ Thermal receipt: booking receipt for walk-in (80mm width compatible)
```

### Section F: Admin Portal (admin.therooms.in)
```
□ □ □ Login page loads on admin.therooms.in/login
□ □ □ Role guard: non-admin attempting login → 403 redirect
□ □ □ Dashboard: Occupancy % (green / red based on threshold)
□ □ □ Dashboard: Revenue MTD with trend comparison (vs last month)
□ □ □ Dashboard: bar chart (6-month revenue)
□ □ □ Dashboard: line chart (30-day occupancy)
□ □ □ Dashboard: recent bookings table (last 10)
□ □ □ Dashboard: maintenance alerts (rooms in maintenance/blocked)
□ □ □ Room Management: all 36 rooms in card grid
□ □ □ Room Management: filter by Studio/Premium type ✅
□ □ □ Room Management: filter by status ✅
□ □ □ Room Management: search by room number ✅
□ □ □ Edit Room: price update (single/double) with save + audit log
□ □ □ Edit Room: photo upload → MinIO (up to 10 photos per room)
□ □ □ Edit Room: drag-and-drop reorder → sortOrder saved to DB
□ □ □ Edit Room: photo caption inline edit
□ □ □ Edit Room: delete photo with "Are you sure?" confirm
□ □ □ Edit Room: status toggle (Vacant ↔ Maintenance ↔ Blocked)
□ □ □ Edit Room: amenities assign/unassign checkboxes (15 options)
□ □ □ Edit Room: internal notes area (admin-only, not guest-visible)
□ □ □ Edit Room: save → audit log entry for price change / status description
□ □ □ Amenity Management: add/edit/delete amenities
□ □ □ Amenity Management: icon picker (lucide search grid)
□ □ □ Announcement Manager: create banner with image + schedule
□ □ □ Announcement Manager: preview banner before saving
□ □ □ Announcement Manager: reorder priority (drag-and-drop)
□ □ □ Announcement Manager: deactivate/archive with toggle
□ □ □ Announcement appears on website carousel ✓ (test)
□ □ □ Discount Management: create Corporate | Student | Seasonal | Extended | Loyalty discounts
□ □ □ Discount Management: set minDays, maxDays, validity dates
□ □ □ Discount Management: set maxUses (or unlimited)
□ □ □ Discount Management: deactivate doesn't delete → history preserved
□ □ □ Discount applied in booking flow: validates → shows savings in green
□ □ □ Booking Management: search by booking ID → result found
□ □ □ Booking Management: search by guest name → results found
□ □ □ Booking Management: filters (status / source / payment status) all working
□ □ □ Booking Management: edit booking dates → price recalculates
□ □ □ Booking Management: cancel booking → reason required
□ □ □ Booking Management: view booking detail → guest info + room info + docs
□ □ □ Booking Management: CSV export with correct data for applied filters
□ □ □ FO User Management: create FO user (name, email, PIN, shift)
□ □ □ FO User Management: edit FO user → PIN reset
□ □ □ FO User Management: deactivate FO user → they cannot log in
□ □ □ FO User Management: force logout for a specific user
□ □ □ Revenue Report: gross / net / discount / GST breakdown ✅
□ □ □ Revenue Report: daily bar chart rendered ✅
□ □ □ Revenue Report: source mix pie chart ✅
□ □ □ Occupancy Report: % occupied by day/week/month ✅
□ □ □ Occupancy Report: Studio vs Premium separate lines ✅
□ □ □ Booking Report: source mix, cancellation rate, avg stay length ✅
□ □ □ All reports: "Download CSV" button → correct file downloads
□ □ □ Reports: date range picker works on all report types
□ □ □ Settings: hotel name saved → propagates to website ✅
□ □ □ Settings: check-in time (2 PM default) applied in booking flow
□ □ □ Settings: check-out time (11 AM default) applied in booking flow
□ □ □ Settings: GST number → used in invoice generation
□ □ □ Settings: cancellation policy text → shown during booking cancellation
□ □ □ Email Logs: searchable log of all emails sent
□ □ □ Email Logs: preview email content on click
□ □ □ Reports: weekly/monthly trends all render correctly
□ □ □ Reports: "Occupancy Rate" in dashboard: formula = (occupied/total)×100
```

### Section G: Super Admin Portal (superadmin.therooms.in)
```
□ □ □ Login page loads on superadmin.therooms.in/login
□ □ □ Role guard: admin attempting to log in here → 403
□ □ □ Dashboard: total revenue (all-time + this month)
□ □ □ Dashboard: total bookings (all-time + this month)
□ □ □ Dashboard: RevPAR: Revenue ÷ Available Room Nights ✅
□ □ □ Dashboard: system health indicator (DB, MinIO, Redis, Nginx all green)
□ □ □ Dashboard: audit log feed (last 20 entries, live)
□ □ □ User Management: create Admin account with temp password
□ □ □ User Management: deactivate admin (soft delete)
□ □ □ User Management: cannot delete own account
□ □ □ User Management: cannot demote last super admin
□ □ □ Audit Logs: full multi-portal audit trail ✅
□ □ □ Audit Logs: filter by user / action / date / entity type
□ □ □ Audit Logs: full-text search across action + metadata
□ □ □ Audit Logs: CSV export ✅
□ □ □ Audit Logs: old logs (> 90 days) archived with view option
□ □ □ Audit Logs: view price change for room S101 (from PR #021 audit ✅)
□ □ □ Audit Logs: view booking cancellation (from booking detail ✅)
□ □ □ System Settings: IDFC credentials (masked — show last 4, reveal on click)
□ □ □ System Settings: update IDFC credentials + confirm operation
□ □ □ System Settings: update MinIO credentials
□ □ □ System Settings: update Resend API key
□ □ □ Storage Management: per-bucket usage (GB used) ✅
□ □ □ Storage Management: object count per bucket ✅
□ □ □ Storage Management: MinIO health check (up/down indicator green)
□ □ □ Storage Management: lifecycle rule display
□ □ □ Resend Config: test email sent → email received in inbox ✅
□ □ □ Resend Config: domain verification status shown (DKIM/SPF records)
□ □ □ IDFC Config: sandbox/production toggle functional
□ □ □ IDFC Config: test payment can be triggered from settings
□ □ □ Backups: "Run Backup Now" button triggers script ✅
□ □ □ Backups: last 14 backups listed (date / size / status)
□ □ □ Backups: "Download Backup" generates signed MinIO URL ✅
□ □ □ Backups: "Restore" button → multi-step confirm → restore from backup ✅
□ □ □ Backups: offsite copy to Backblaze B2 configured ✅
□ □ □ Backups: automated schedule (daily 2 AM IST) shown and running ✅
□ □ □ Backups: backup verification report (monthly snapshot tested) ✅
□ □ □ System Health: all services (PostgreSQL, MinIO, Redis, Nginx, Docker) green ✅
□ □ □ System Health: click service → expand with connection logs ✅
□ □ □ System Health: Uptime Kuma monitor URL configurable ✅
□ □ □ Maintenance Mode: enable → website shows static "upgrading" page
□ □ □ Maintenance Mode: FO/Admin/Super Admin portals remain accessible ✅
□ □ □ Maintenance Mode: disable → website restored ✅
□ □ □ "Export All Data" per guest (GDPRcompliance) ✅
□ □ □ Legal: "Delete all Guest Data" per right to erasure ✅
□ □ □ API key rotation: all keys (IDFC, Resend, Msg91) rotatable ✅
□ □ □ SSL: certificates for all 6 subdomains valid ✅
□ □ □ SSL: certificates not expiring within 30 days ✅
□ □ □ Version display: "The Rooms v1.0.0" in footer ✅
□ □ □ Error: IDFC credentials bad → warning shown in system health ✅
□ □ □ Error: MinIO disk > 80% → red alert ✅
□ □ □ Error: backup failed → red alert on dashboard ✅
```

### Section H: Payments
```
□ □ □ IDFC payment page loads correctly (test card used)
□ □ □ Payment initiated → booking record created with PENDING status
□ □ □ IDFC webhook received → payment updated to PAID ✅
□ □ □ IDFC idempotent: duplicate webhook → response 200 OK, no double-processing
□ □ □ IDFC signature validated in webhook handler
□ □ □ IDFC failure path: payment status → FAILED, guest notified ✅
□ □ □ Invoice PDF generated on payment success ✅
□ □ □ Invoice PDF uploaded to MinIO invoices bucket ✅
□ □ □ Invoice emailed to guest (Resend with PDF attachment) ✅
□ □ □ Invoice reflects correct GST (18% on accommodation)
□ □ □ Invoice shows: Hotel name, GST number, address, invoice number
□ □ □ Invoice shows: guest name, booking ID, room, dates, line items
□ □ □ Booking status → CONFIRMED on payment success
□ □ □ Refund initiated on cancellation of paid booking ✅
□ □ □ Refund amount calculated correctly (after cancellation fee deduction)
□ □ □ Refund status tracked: PENDING → PROCESSED → COMPLETED ✅
□ □ □ Cancellation policy enforced: 24h free / < 24h 50% / no-show full ✅
□ □ □ Cash payment → Booking marked PAID immediately
□ □ □ Cash payment → receipt printed (thermal format) ✅
□ □ □ Corporate Invoice → booking PAID on payment from company
□ □ □ IDFC health check endpoint: app can detect IDFC outage ✅
□ □ □ IDFC outage fallback: online payment disabled, cash-only mode shown
□ □ □ Payment method split in all revenue reports ✅
□ □ □ IDFC sandbox credentials used for dev/test
□ □ □ IDFC production credentials (separate) stored securely
□ □ □ IDFC webhook tested locally (ngrok + sandbox)
□ □ □ Cash drawer reconciliation in EOD report ✅
□ □ □ Corporate invoice template (B2B, GST-compliant) ✅
```

### Section I: Notifications & Email
```
□ □ □ Booking confirmation email sent (Resend) ✅
□ □ □ Check-in reminder email sent 24h before check-in ✅
□ □ □ Check-out reminder email sent morning of check-out ✅
□ □ □ Invoice PDF attached in invoice email ✅
□ □ □ Complaint notification sent to FO ✅
□ □ □ Extend stay notification sent to FO + admin ✅
□ □ □ Daily EOD report email to admin ✅
□ □ □ System alert email to super admin (critical errors) ✅
□ □ □ WhatsApp notifications via Msg91 sent ✅
□ □ □ WhatsApp fallback to SMS (if WhatsApp number not available) ✅
□ □ □ Night audit notification to superadmin after EOD close ✅
□ □ □ CRON: 2 AM IST → automated backup triggered ✅
□ □ □ CRON: every hour → check-in reminders ✅
□ □ □ CRON: 8 AM IST → checkout reminders ✅
□ □ □ CRON: 11:59 PM IST → night audit (if auto-mode) ✅
□ □ □ CRON: 15 min → IDFC webhook queue processing ✅
□ □ □ All CRON jobs wrapped in try-catch ✅
□ □ □ CRON failure → error logged in audit + alert to superadmin ✅
```

### Section J: Integrations
```
□ □ □ Resend: API key configured in .env ✅
□ □ □ Resend: test email sent and received ✅
□ □ □ Msg91: SMS API key configured ✅
□ □ □ Msg91: test SMS sent (hotel number confirmed) ✅
□ □ □ Cloudflare: DNS A records for all 6 subdomains ✅
□ □ □ Cloudflare: SSL enabled (full/strict mode) ✅
□ □ □ IDFC: sandbox URL configured ✅
□ □ □ IDFC: test payment end-to-end completed ✅
□ □ □ IDFC: production credentials stored in env (separate from sandbox) ✅
□ □ □ MinIO: browser console accessible (port 9001) ✅
□ □ □ MinIO: programmatic access from Next.js apps working ✅
□ □ □ MinIO: signed URL generation for private buckets ✅
□ □ □ Google Maps: iframe embed on /contact page ✅
□ □ □ Google Tag Manager: GTM-XXXXXXX installed on all pages ✅
□ □ □ Uptime Kuma: all services monitored ✅
□ □ □ Uptime Kuma: backup script monitor configured ✅
```

### Section K: Security
```
□ □ □ HTTPS enforced on all subdomains ✅
□ □ □ All secrets (DB password, IDFC keys, Resend key, MinIO credentials) in .env only
□ □ □ .env is in .gitignore (never committed to repo) ✅
□ □ □ SQL injection prevention: Prisma parameterized queries (all DB calls) ✅
□ □ □ XSS prevention: React HTML escaping (no dangerouslySetInnerHTML without sanitization) ✅
□ □ □ CSRF tokens: enabled on all form submissions ✅
□ □ □ MinIO guest-documents bucket: no public access ✅
□ □ □ MinIO guest-documents: signed URL required (7-day expiry) ✅
□ □ □ Guest documents: accessible only by ADMIN + SUPER_ADMIN ✅
□ □ □ Guest document access: every download/view logged to audit_logs ✅
□ □ □ Input sanitization: every Zod schema validates all user inputs ✅
□ □ □ Rate limiting: public API endpoints rate-limited ✅
□ □ □ Rate limiting: login endpoint specifically (5 attempts/15min) ✅
□ □ □ Audit log: every create/update/delete operation logged with user ID ✅
□ □ □ Audit log: operations logged to persistent DB ✅
□ □ □ No PII in error logs ✅
□ □ □ No secrets in server-side logs ✅
```

### Section L: SEO
```
□ □ □ robots.txt: allow all crawlers + sitemap URL ✅
□ □ □ sitemap.xml: generated for all /rooms/[id], /pricing, /amenities, /contact, /faq ✅
□ □ □ JSON-LD: Hotel schema on homepage ✅
□ □ □ JSON-LD: HotelRoom schema on all 36 room detail pages ✅
□ □ □ JSON-LD: ItemList schema on /rooms listing ✅
□ □ □ JSON-LD: FAQPage schema on /faq ✅
□ □ □ OG tags: title + description + image on every marketing page ✅
□ □ □ Twitter card: summary_large_image on all marketing pages ✅
□ □ □ canonical URL: set on every page (self-referential) ✅
□ □ □ Mobile-friendly test: all pages pass ✅
□ □ □ Core Web Vitals: LCP < 2.5s, CLS < 0.1, INP < 200ms ✅
□ □ □ Alt text: every image has descriptive alt text ✅
□ □ □ Image optimization: Next.js <Image> on all images ✅
□ □ □ Image format: JPEG for photos, WEBP used as output format ✅
□ □ □ Hero image dimensions: ≥ 1200×630px (for OG sharing) ✅
□ □ □ Meta description: unique per page, 120–160 chars ✅
□ □ □ Title tag: unique per page, max 60 chars ✅
```

### Section M: Backups & Disaster Recovery
```
□ □ □ Automated daily backup (PostgreSQL pg_dump) ✅
□ □ □ Automated MinIO data backup ✅
□ □ □ Backup retention: 14 daily backups ✅
□ □ □ Off-site backup: configured to Backblaze B2 ✅
□ □ □ Off-site backup: encrypted at rest (AES-256) ✅
□ □ □ Backup restore tested (monthly verification run) ✅
□ □ □ Backup verification report: "Verified on [DATE] — PASS" ✅
□ □ □ Disaster Recovery document: step-by-step recovery procedure written ✅
□ □ □ Disaster Recovery: RTO < 2 hours documented and achievable ✅
□ □ □ Emergency contact list: Hostinger support, IDFC support, Msg91 support ✅
```

### Section N: Performance
```
□ □ □ Lighthouse Performance score ≥ 80 on homepage ✅
□ □ □ Lighthouse Performance score ≥ 75 on room listing page ✅
□ □ □ Images: lazy loaded (Next.js Image) below fold ✅
□ □ □ Images: WebP format, explicit width + height (prevents CLS) ✅
□ □ □ Fonts: Google Fonts loaded with display=swap ✅
□ □ □ Fonts: preconnect to fonts.googleapis.com ✅
□ □ □ API: no-cache on booking data ✅
□ □ □ API: ISR 1h on room listings (revalidate: 3600) ✅
□ □ □ DB queries: covered by indexes (no full table scans on common queries) ✅
□ □ □ API response time: room availability check < 500ms ✅
□ □ □ API response time: room detail < 300ms ✅
□ □ □ API response time: booking creation < 2s (includes payment initiation) ✅
```

### Section O: Accessibility
```
> ☐ Semantically correct HTML: <main>, <nav>, <header>, <footer> used correctly
> ☐ ARIA labels on all icon buttons without text
> ☐ ARIA labels on all custom interactive components
> ☐ ARIA: form inputs have labels (htmlFor association)
> ☐ Focus management: modal open → focus inside modal
> ☐ Focus management: modal close → focus returns to trigger element
> ☐ Keyboard nav: Tab, Shift+Tab, Enter, Escape all work correctly
> ☐ Skip navigation link: "Skip to main content" (hidden, shown on focus)
> ☐ WCAG 2.1 AA contrast ratios: 4.5:1 normal text, 3:1 large text
> ☐ Color + icon never alone as the only status indicator (always paired with text)
> ☐ Screen reader tested (VoiceOver on Mac or NVDA on Windows)
> ☐ axe-score: zero A-level violations on main user flows
> ☐ Forms: error messages linked via aria-describedby
> ☐ Forms: required fields marked with aria-required="true"
> ☐ Focus ring: visible (2px coral outline) on all interactive elements
> ☐ Input zoom on iOS: prevented (font-size: 16px minimum on mobile inputs)
> ☐ Safe area insets respected on iOS (notch + home bar)
```

---

# CHECKLIST 2: FRONT OFFICE DASHBOARD
## fo.therooms.in — Verifying the POS & Operations Hub

### Authentication & Access
```
> ☐ FO portal only accessible via fo.therooms.in subdomain
> ☐ Correct staff can log in with email + password
> ☐ Failed login: "Invalid credentials" message (no indication which field is wrong)
> ☐ 5 failed attempts → account locked for 15 min → "Account locked" message
> ☐ After lockout: can unlock via magic link or admin action
> ☐ FO user cannot access admin.therooms.in (403 redirect)
> ☐ Wrong subdomain → 403 at correct portal domain
```

### Dashboard Homepage
```
> ☐ Today's date shown in IST (India Standard Time)
> ☐ "In-House: X/36 rooms" count matches actual bookings where check-out > today AND status = CHECKED_IN
> ☐ Arrivals list matches bookings where check-in = today AND status ≠ CANCELLED
> ☐ Departures list matches bookings where check-out = today
> ☐ Revenue Today: sum of Payment.amount where status=PAID AND createdAt = today
> ☐ Task queue shows: "Documents pending (X)"
> ☐ Task queue shows: "Complaints open (X)"
> ☐ Quick action bar always visible (even on scroll)
> ☐ Date/time display updates every minute (real-time clock)
> ☐ Dark mode toggle if implemented: persists to localStorage
```

### Room Availability Board
```
> ☐ All 36 rooms appear in grid (S101–S118 , P101–P118)
> ☐ Studio rooms: green (VACANT) / red (OCCUPIED) / yellow (MAINTENANCE) / grey (BLOCKED)
> ☐ Premium rooms: correct color coding
> ☐ Clicking room shows action panel (right panel desktop / bottom sheet mobile)
> ☐ Hover on room (desktop): tooltip shows guest name + dates
> ☐ Date picker: "View for [date]" changes occupancy view for selected date
> ☐ Filter: "Available Only" hides OCCUPIED rooms
> ☐ Search "S10": room S101 matches
> ☐ Room status color changes after: check-in (VACANT → OCCUPIED red) / check-out (OCCUPIED → OCCUPIED until cleaned → VACANT)
> ☐ Print view: loads /availability/print in new tab
> ☐ Print view: black/white friendly, room numbers prominent, room status in legend
> ☐ Mobile: horizontal scroll works, 60px touch targets
> ☐ Mobile: pinch-to-zoom works on room grid
```

### Walk-In Booking
```
> ☐ Walk-in booking completes end-to-end in under 2 minutes (returning guest)
> ☐ Search existing guest: type "987" → guest with phone +91-987XXXXXXX found
> ☐ Existing guest matched: auto-fill all fields → name, phone, email shown
> ☐ New guest: "Create New Guest" form shows → creates guest in DB
> ☐ Room  selection: only VACANT rooms shown
> ☐ Camera capture: "Scan Front" opens device camera (environment-facing)
> ☐ Camera capture: photo preview shown before upload
> ☐ Document upload: progress bar shown, "Uploaded ✓" confirmation
> ☐ Cash payment: "₹X received" → "Give ₹Y change" → booking confirmed
> ☐ Cash payment: thermal receipt prints (80mm width format)
> ☐ UPI/Card: "Generate Payment Link" → WhatsApp link received by guest
> ☐ Booking confirmation: booking ID shown prominently for door tag
> ☐ Booking confirmation: "Email Receipt" sends receipt to guest email
```

### Check-In Flow
```
> ☐ Search by booking ID: type BKN-202603XX-XXXX → booking found and loaded
> ☐ Booking detail: room number, guest name, check-in/out dates shown correctly
> ☐ Booking detail: payment status badge (PAID = green ✓, PENDING = yellow)
> ☐ Document section: uploaded document thumbnails shown
> ☐ Digital signature pad: canvas renders, guest can sign
> ☐ "Complete Check-In" → room status changes to OCCUPIED in real-time
> ☐ Check-in receipt: WhatsApp message sent to guest with receipt
> ☐ Check-in receipt: print room tag (A6, 80mm format): room number + guest name + date + BKN
> ☐ New booking created during FO walk-in → appears in arrivals list immediately
> ☐ If room not pre-assigned: room selection opens
```

### Check-Out Flow
```
> ☐ Check-Out: search by booking ID OR tap room from availability board
> ☐ Final bill: base × nights + extras - discounts = total shown
> ☐ Add extra charge: "Late checkout fee" → total recalculates (+₹500)
> ☐ "Complete Check-Out" → room status changes to VACANT
> ☐ Invoice emailed to guest automatically
> ☐ Print check-out summary: clean, A6 format
> ☐ Early checkout: prorated message shown if requested before scheduled date
> ☐ No-show handling: "Mark No-Show" available on booking detail (admin action)
```

### Complaints & Extend Stay
```
> ☐ Complaints queue: kanban OPEN | IN_PROGRESS | RESOLVED columns shown
> ☐ Drag-and-drop on desktop: card moves between columns
> ☐ Status change on card tap (mobile): each action opens bottom sheet
> ☐ Complaints: photo thumbnails shown on card
> ☐ Extend stay: date picker shows current check-out date (can't go before)
> ☐ Extend stay: new total calculated based on extended period
> ☐ Extend stay: status REQUEST_PENDING shown in booking records
> ☐ Extension approved by FO → booking updated + notification sent to guest ✅
```

### Daily Report & EOD
```
> ☐ Daily report: revenue breakdown (gross / discount / net / GST)
> ☐ Daily report: revenue by payment method (cash vs online split)
> ☐ Daily report: arrivals/departures list complete and accurate
> ☐ Cash reconciliation: expected vs actual input field
> ☐ If cash discrepancy > ₹50: warning shown and alert sent to admin
> ☐ "Run Night Audit" button: runs EOD close process
> ☐ Night audit complete: "Audit locked at [TIME]" badge shown
> ☐ After audit: all transactions for the day locked (no edits allowed)
> ☐ EOD report email: sent to admin@therooms.in automatically
```

### Notifications & Alerts
```
> ☐ Booking arrival shows notification in FO (toast or badge)
> ☐ Active complaint shows notification (badge in complaints queue tab)
> ☐ Payment failure: FO admin notified → booking requires manual resolution
> ☐ System error: red banner on FO dashboard if database disconnected
> ☐ Price update: FO sees real-time availability update (within 30s poll)
```

### Offline Mode (PWA)
```
> ☐ Service worker registers and caches app shell
> ☐ When offline: room availability board shows last-known state
> ☐ When offline: "Offline: transactions will sync when reconnected" indicator
> ☐ When offline: check-in queued locally
> ☐ On reconnect: queued check-ins sync → booking status updated in DB ✅
> ☐ Add to Home Screen: PWA installable on iOS/Android
```

---

# CHECKLIST 3: ADMIN DASHBOARD
## admin.therooms.in — Verifying the Property Operations Center

### Authentication & Access
```
> ☐ Admin portal accessible only via admin.therooms.in
> ☐ Only ADMIN role can log in; guest/FO access → 403 redirect
> ☐ Admin created by Super Admin can log in with temp password
> ☐ Must change password on first login before accessing dashboard
> ☐ Rate limiting: 5 failed attempts → 15 min lockout
> ☐ Cannot access superadmin.therooms.in (even if they try)
```

### Dashboard KPIs
```
> ☐ Occupancy %: (rooms CHECKED_IN today) / 36 × 100 = correct value
> ☐ Revenue MTD: sum of PAID payments from 1st of month to today
> ☐ Revenue MTD trend: shows % vs last month (up ▲ / down ▼)
> ☐ Bar chart: last 6 months of revenue data (Jan–Jun)
> ☐ Line chart: 30-day occupancy trend
> ☐ Maintenance alerts: lists rooms where status = MAINTENANCE or status = BLOCKED
> ☐ Recent bookings: last 10 bookings sorted by created_at DESC
> ☐ Upcoming arrivals: bookings where check-in is within next 3 days
> ☐ Quick action: "View All Bookings" → /bookings page 
```

### Room Management
```
> ☐ All 36 rooms listed in grid: S101–S118 → P101–P118
> ☐ Filter: Studio → shows only S101–S118 (18 rooms)
> ☐ Filter: Premium → shows only P101–P118 (18 rooms)
> ☐ Search room number "S12" → S112 and S102 and S121 all shown in results
> ☐ Edit room S101:
    — Change price Single from ₹999 to ₹1,099 → saves to DB ✅
    — Price change logged in audit_logs ✅
    — Website: updated price shown correctly on room detail page ✅
> ☐ Edit room: upload 3rd photo → MinIO upload → thumbnail shown in gallery ✅
> ☐ Edit room: reorder photos → drag S101-photo1 to front → sortOrder updated in DB ✅
> ☐ Edit room: edit photo caption → text saves ✅
> ☐ Edit room: delete photo → confirm prompt → deleted from MinIO + DB ✅
> ☐ Edit room: "Mark Maintenance" → status changes immediately → board reflects ✅
> ☐ Edit room: "Mark Blocked" → status changes → bookings blocked for blocked room ✅
> ☐ Amenity management: uncheck WiFi from S101 → amenity removed → audit log entry ✅
> ☐ Amenity management: add new amenity "Smart Lock" → appears in all room amenity lists ✅
```

### Announcement Management
```
> ☐ Create announcement: "Monsoon Special 20% Off" + image + /book link
> ☐ Preview banner: shows exactly as on website carousel ✅
> ☐ Save → appears on website homepage within 2 min (ISR revalidation) ✅
> ☐ Create announcement: set active period (today + 7 days) → expires automatically ✅
> ☐ Reorder: drag "Monsoon Special" to top → appears first in carousel ✅
> ☐ Deactivate: toggle off → banner removed from carousel ✅
> ☐ "Save & View Website" → opens therooms.in in new tab ✅
```

### Discount Management
```
> ☐ Create "CORP15" discount: Corporate, 15%, min 5 nights
> ☐ Create "STUDENT20" discount: Student, 20%, min 3 nights
> ☐ Create "WEEKEND10" discount: Seasonal, 10%, valid Fri–Sun only
> ☐ Create "EXTENDED15" discount: Extended Stay, 15%, min 15 nights
> ☐ Validate discount on website: CORP15 applied → ₹X discount in green ✅
> ☐ Validate discount code that requires 5 nights: with 3 nights → "Minimum 5 nights required" error ✅
> ☐ Deactivate discount: toggle off → code no longer works ✅ (history preserved in DB)
> ☐ Edit discount: change % from 10% to 12% → saved ✅
```

### Booking Management
```
> ☐ Search booking BKN-202603XX-XXXX → booking found ✅
> ☐ Search guest "Rahul" → all bookings for Rahul shown ✅
> ☐ Filter by Confirmed → 50+ bookings shown ✅
> ☐ Filter by Checked-In → onlyChecked-In bookings shown ✅
> ☐ CSV export: download → BKN-202603XX-XXXX.csv has correct rows and columns ✅
> ☐ Edit booking: change check-out date from 20 Mar to 25 Mar
    — Booking page recalculates total (days × rate = new amount) ✅
    — "New amount: ₹X, Old amount: ₹Y. Difference: ₹Z" shown in confirmation ✅
    — Confirm → booking updated → audit log entry ✅
    — If difference > 0: invoice for additional amount sent ✅
> ☐ Cancel booking: "Reason" required → "Guest had emergency" → submitted ✅
> ☐ Cancel booking with PAID payment: refund initiated → status REFUNDED shown ✅
> ☐ View booking: all tabs (Guest | Room | Documents | Payments | Activity)
> ☐ Booking detail → Documents: uploaded ID shown → "View" → full-screen modal ✅
> ☐ Booking detail → Activity: all status changes logged (timestamps) ✅
```

### Staff Management
```
> ☐ Create FO user: "Ravi Kumar" + ravi@therooms.in + PIN 4521 + Evening shift
> ☐ Save → FO user created → can log in to FO portal ✅
> ☐ Edit FO user: change shift Morning → saved ✅
> ☐ Deactivate FO user: clicked → "Account deactivated" → cannot log in ✅
> ☐ Reactivate FO user: toggle back on → can log in again ✅
> ☐ Reset PIN: "Send new PIN" → email sent to FO user ✅
> ☐ Cannot delete FO user (only deactivate) → history preserved ✅
```

### Reports
```
> ☐ Revenue report: date range "This Month" → correct totals for current month
> ☐ Revenue chart: bars for each day of month (Jan-Dec range: monthly bars)
> ☐ Export CSV: columns: Date | Bookings | Gross Revenue | Discounts | Net Revenue | GST
> ☐ Revenue by Source: pie chart shows Website / Walk-In / Phone / OTA split
> ☐ Occupancy Report: Studio vs Premium separate lines correctly calculated
> ☐ Avg Stay Duration: correct formula (total nights booked / total bookings)
> ☐ Repeat Guest %: correct (repeat guests / total unique guests who booked) × 100
> ☐ Cancellation Rate: % of CANCELLED bookings over total bookings
```

### Settings
```
> ☐ Hotel name saved → visible on website within ISR revalidate (1h)
> ☐ Check-in time changed to 3 PM → website/invoice/confirmations all update
> ☐ GST number saved → used in invoice generation correctly
> ☐ Cancellation policy text updated → shown during guest booking cancellation flow
> ☐ Bank account details updated → used in invoice B2B format
> ☐ Contact info saved → shown on website / FAQ / booking confirmation email
```

---

# CHECKLIST 4: GUEST PORTAL
## my.therooms.in — Verifying the Guest Self-Service Portal

### Authentication
```
> ☐ Magic link sent to guest email: "Sign in to The Rooms" subject line
> ☐ Magic link expires after 15 minutes
> ☐ Expired magic link: "This link has expired. Request a new one." message
> ☐ New guest account created on booking → magic link received within 5 min of payment
> ☐ Guest can access portal with magic link without password
> ☐ Reset password via "Forgot password?" link → magic link sent ✅
```

### Dashboard
```
> ☐ Greeting: "Good Morning/Afternoon/Evening, [Guest Name]" (time-aware)
> ☐ Upcoming stay card: "X days to go" countdown correct for booking in T+days
> ☐ Upcoming stay card: room type (Studio/Premium) + room number (if assigned)
> ☐ Loyalty tier: Bronze/Silver/Gold based on stay count
> ☐ "2 more stays to Gold" shown → links to loyalty tier explanation
> ☐ Quick actions visible: Upload Docs | Raise Complaint | Extend Stay
> ☐ Recent bookings: last 3 bookings with booking ID + date range
> ☐ "View All Bookings →" link → /bookings page
> ☐ Notification badge if unread notifications (if implemented)
> ☐ Bottom tab nav: 4 tabs (Dashboard | Bookings | Documents | Profile)
```

### Booking List
```
> ☐ Default tab: Upcoming stays (status NOT CHECKED_OUT AND NOT CANCELLED)
> ☐ Upcoming tab: all future bookings + currently checked-in bookings
> ☐ Past tab: only CHECKED_OUT bookings
> ☐ Cancelled tab: CANCELLED bookings
> ☐ Each row: booking ID (monospace) | room type | dates | status | ₹total
> ☐ Booking card click → navigates to booking detail page
> ☐ Search booking by ID: type partial ID → correct booking found
> ☐ Filter by year: dropdown filters bookings to year ✅
> ☐ Empty state (no past bookings): "No past stays yet. Book your first room!"
```

### Booking Detail
```
> ☐ Booking number: prominent, copyable button ("Copy to clipboard")
> ☐ Status timeline: draws correct path at each stage:
    — CONFIRMED: step "Booking Confirmed ✓"
    — CHECKED_IN: "Check-In ✓" (green checkmark)
    — CHECKED_OUT: "Check-Out ✓" (completed)
> ☐ Room card: photo + type badge + room number (if assigned)
> ☐ Stay details: check-in/out dates shown in human format (15 Mar 2026)
> ☐ Payment section:
    — Base rate breakdown (rate × nights = ₹X)
    — Extras  ₹X
    — Discount -₹X (green, if applied)
    — GST ₹X
    — TOTAL ₹X (bold)
> ☐ Payment status: PAID ✓ badge (green) / PENDING badge (yellow)
> ☐ "Download Invoice" → PDF downloads from MinIO
> ☐ If no invoice yet: button disabled with "Invoice not yet available"
> ☐ Cancel booking button → opens cancellation modal
> ☐ Cancellation policy shown: matching settings
> ☐ Confirm cancellation → two-step ("Are you sure?" → "Yes, cancel") ✅
> ☐ After cancellation: status → CANCELLED + refund info shown if paid
> ☐ Cancel booking email received (cancellation confirmation)
> ☐ After cancellation: booking disappears from Upcoming, appears in Cancelled tab
```

### Document Upload
```
> ☐ "Upload Documents" page: lists upcoming stays requiring ID
> ☐ "X upcoming stays need documents" awareness message
> ☐ Document type: Aadhaar | Passport | Voter ID | Driving License
> ☐ Camera capture: "📷 Scan Front" opens camera (environment-facing on mobile)
> ☐ Front photo captured → preview shown
> ☐ "Scan Back" → camera opens (user-facing on mobile)
> ☐ Back photo captured → shown next to front preview
> ☐ "Accept & Upload" button: uploads to MinIO → progress bar
> ☐ Success: "Documents uploaded successfully. Front desk will verify upon arrival."
> ☐ Document status next to booking: "✓ Docs Uploaded — Pending Review"
> ☐ If rejected: "Rejected — Please upload new clearer photos" + rejection note
> ☐ Re-upload flow: starts fresh upload for that doc type
```

### Complaints
```
> ☐ "Raise Complaint" → complaint form accessible ✅
> ☐ Booking auto-selected (most recent past stay)
> ☐ Manual booking selection if multiple past stays
> ☐ Subject: dropdown list (AC Not Working / Hot Water Issue / WiFi / Cleanliness / Noise / Other)
> ☐ Description: textarea, min 20 chars
> ☐ Photo upload: "Add Photo" → camera opens → max 3 photos
> ☐ "Mark as Urgent" checkbox checked → high-priority flag set
> ☐ Submit → "Complaint raised. Our team will address it shortly."
> ☐ Complaint confirmation email received
> ☐ After submission: booking detail shows "Complaint filed ✓"
> ☐ FO resolves complaint → email notification "Complaint resolved: [issue]" received
```

### Extend Stay
```
> ☐ "Request Extension" button accessible from booking detail (upcoming bookings)
> ☐ Current check-out date shown as default (cannot select before this)
> ☐ New check-out date picker: selectable date > current check-out
> ☐ "New total: ₹X" shown instantly (calculator)
> ☐ Submit → "Extension requested — awaiting front office approval"
> ☐ Status shown in booking detail: REQUEST_PENDING + note
> ☐ Extension approved by FO → email "Good news! Your stay has been extended"
> ☐ Extension approved → booking dates updated → new check-out reflected
> ☐ Extension rejected → email "Unfortunately we couldn't extend your stay"
```

### Feedback
```
> ☐ "Leave Review" button shown on Booking detail for CHECKED_OUT bookings
> ☐ Star rating: 1–5 stars tap to rate
> ☐ Review text: max 500 chars, character counter shown
> ☐ "Post anonymously" toggle: if on, shows "Guest" not name
> ☐ Submit → "Thank you for your feedback! It helps us improve."
> ☐ After submission → stars + review text saved → "Edit Review" not available
> ☐ Admin approval pending → review not shown on website (yet)
```

### Profile & Settings
```
> ☐ Edit name + save → changes reflected in welcome greeting immediately
> ☐ Edit phone → validates Indian phone format (+91- prefix)
> ☐ Edit email → verification email sent to new address
> ☐ Change password: old + new + confirm → if old incorrect → error shown
> ☐ Change password: fields validated (new must differ from old, min 8 chars)
> ☐ Change password: success → "Password updated. Log in again." session log
> ☐ Delete account: confirmation dialog → "Last chance" warning → accept → 
> ☐ After delete: "Account deleted. Your data has been removed per GDPR." email
```

---

# CHECKLIST 5: SUPER ADMIN DASHBOARD
## superadmin.therooms.in — Verifying the Ownership Control Center

### Authentication & Access Control
```
> ☐ Only SUPER_ADMIN can log in to superadmin.therooms.in
> ☐ ADMIN attempting to log in here → "Access Denied" page (403)
> ☐ Cannot delete own account → button disabled for own user
> ☐ Cannot demote own role → own role cannot be changed
> ☐ "Sign out all other sessions" works → all sessions except current invalidated
> ☐ Force logout via User Management → user immediately shown "Session expired"
> ☐ Audit entry created for user management actions
```

### Aggregate Dashboard
```
> ☐ Total Revenue (all-time): sum of all PAID payments in DB
> ☐ Revenue MTD: sum of PAID payments from 1st of month to now
> ☐ Total Bookings: count of all bookings (regardless of status)
> ☐ Bookings MTD: count of this month's bookings
> ☐ Avg Occupancy (30 days): avg daily (rooms occupied / 36 × 100)
> ☐ RevPAR: RevPAR = Revenue MTD / (rooms × days in month so far)
> ☐ System health: 4 colored indicator dots → green = all OK
> ☐ Audit feed: last 20 log entries → updates when new action performed
> ☐ Click any audit entry → expands to show full details (who/what/when)
```

### Audit Log Deep Verification
```
> ☐ Audit log contains: room pricing changes by admin (price old → new)
> ☐ Audit log contains: new bookings (FO walk-in)
> ☐ Audit log contains: check-in/check-out events (timestamp + room)
> ☐ Audit log contains: document access (admin viewed guest docs)
> ☐ Audit log contains: refund initiations
> ☐ Audit log contains: FO user deactivation by admin
> ☐ Audit log contains: system config changes (IDFC credentials update, etc.)
> ☐ Audit log: date filter "Today" → only today's entries
> ☐ Audit log: date filter "This Week" → correct entry count
> ☐ Audit log: filter by FRONT_OFFICE → only FO user actions shown
> ☐ Audit log: filter by entity type "booking" → only booking actions
> ☐ Audit log: text search "S101" → finds all actions involving room S101
> ☐ Audit log: export CSV → contains all columns (When, Who, Action, Entity, Entity ID, IP, Metadata)
> ☐ Audit log: logs older than 90 days → accessible via archive view
```

### Admin Account Management
```
> ☐ Create new admin: "Kiran Nair" + kiran@therooms.in + temp password
> ☐ Email sent to kiran@therooms.in: "Your The Rooms Admin Account"
> ☐ Admin created, logs in with temp password → must change password
> ☐ Edit admin: change name from "Kiran Nair" to "Kiran M. Nair" → saved
> ☐ Deactivate admin: "Block Account" → kiran can't login → "Account disabled"
> ☐ Reactivate admin: "Enable Account" → kiran can login again
> ☐ View admin activity: log of all actions by that admin
> ☐ Cannot see other admin's password reset (only force-reset via magic link)
```

### System Configuration
```
> ☐ IDFC credentials: shown masked (••••••••XXXX) with "Show" button
> ☐ Update IDFC credentials: new client ID stored → env updated + restart needed
> ☐ MinIO credentials: update endpoint + credentials → credentials validated before save
> ☐ Resend API key: change key → test email sent to superadmin email → verify received
> ☐ After API key change: booking confirmation still sends (test with trial booking)
> ☐ Tenant name: "The Rooms" locked for single-property setup future-ready
```

### MinIO Management
```
> ☐ Storage usage: rooms-photos bucket shows total size used
> ☐ Storage usage: guest-documents bucket shows 0 bytes used (pristine)
> ☐ MinIO health check: shows "Up" with current API response time
> ☐ Object count: rooms-photos shows 18 (1 photo per room seeded)
> ☐ Lifecycle rules: "guest-documents: 90-day auto-delete" shown and correct
> ☐ View bucket details: click → shows all objects in bucket (if manageable count)
> ☐ New bucket creation: "Add Bucket" → create test-bucket → reflected in list
```

### Backup & Restore
```
> ☐ "Run Backup Now" → backup runs → shows in backup list with new date
> ☐ Backup completion: size shown (DB pg_dump + MinIO data)
> ☐ "Download" → signed MinIO URL generated → backup downloads as .tar.gz
> ☐ "Restore from Backup":
    — Step 1: "This will overwrite current data. Are you sure?" (first confirm)
    — Step 2: "Type [BACKUP_DATE] to confirm" (second confirm)
    — Restore runs → DB reloaded from pg_dump
    — Smoke tests pass → "Restore successful" message
> ☐ Backup schedule: "Daily at 2:00 AM IST" → confirmed in cron
> ☐ Offsite backup configured: Backblaze B2 shows sync status
> ☐ Backup verification: "Last Verified: [date]" shows less than 30 days old
```

### System Health
```
> ☐ PostgreSQL status: green (up) + response time shown
> ☐ MinIO status: green (up) + available space shown
> ☐ Redis status: green (up) + memory usage %
> ☐ Nginx status: green (up) + requests/sec
> ☐ Docker: all containers (postgres, minio, redis, web, fo, admin, superadmin) — running
> ☐ Click service → expand: connection logs + last error if any
> ☐ Maintenance mode toggle: "Enable Maintenance Mode" → public site shows "We'll be back soon"
> ☐ Internal portals (fo/admin/superadmin) accessible during maintenance
> ☐ Disable maintenance → public site restores to normal
> ☐ Incident simulation: stop postgres container → wait 60s → health shows red + alert email
```

### Communication & Alerts
```
> ☐ System alert email: "Booking system: payment gateway not responding" (artificially test)
> ☐ System alert email: "Backup failed — disk full" (artificially test)
> ☐ System alert email: "Guest document bucket >80% storage" (if implemented)
> ☐ GDPR: "Export [Guest Name]'s data" → downloads JSON of all their data
> ☐ GDPR: "Delete [Guest Name]'s data" → removes PII, audit log notes action
```

### Security Compliance
```
> ☐ SSL certificate expiry: >30 days remaining on all subdomains
> ☐ SSL certificate expiry: alert when < 30 days (email to superadmin)
> ☐ API keys: last rotated date visible on each key setting
> ☐ Rotating IDFC API key: old key deactivated in IDFC portal, new key saved → payments work ✅
> ☐ Version display: "The Rooms v1.0.0" in super admin footer ✅
```

---

# CHECKLIST 6: SEO VERIFICATION
## therooms.in Public Website — Complete SEO Verification

### Title Tags (Page Titles)
```
> ☐ Homepage: "The Rooms — Premium Hotel Stays from ₹999/night | therooms.in"
> ☐ Rooms listing: "Our Rooms — Studio & Premium Stays | The Rooms"
> ☐ Room S101 detail: "Studio Room S101 — Stays from ₹999/night | The Rooms"
> ☐ Room P101 detail: "Premium Room P101 — Stays from ₹1,999/night | The Rooms"
> ☐ Pricing page: "Hotel Room Prices 2026 — Studio ₹999 | Premium ₹1,999 | The Rooms"
> ☐ Amenities: "Hotel Amenities — WiFi, AC, Power Backup & More | The Rooms"
> ☐ Contact: "Contact Us | The Rooms"
> ☐ FAQ: "Frequently Asked Questions | The Rooms"
> ☐ Booking confirmation: "Booking Confirmed | The Rooms"
> ☐ All 5-step booking pages: unique title per step
```

### Meta Descriptions
```
> ☐ Homepage: 120-160 chars, keyword "hotel India", "₹999/night", "premium"
> ☐ Rooms page: "Browse all 36 rooms — Studio from ₹999/night, Premium from ₹1,999/night"
> ☐ Each room detail: unique description based on room number + type + price
> ☐ Pricing: "Studio ₹999/night, Premium ₹1,999/night. Monthly stays from ₹29,999. No hidden fees."
> ☐ All pages: unique meta description (not duplicate across pages)
```

### Open Graph & Social
```
> ☐ Homepage OG image: ≥ 1200×630px, hotel room photo or branded banner
> ☐ Rooms listing OG image: branded, shows room type
> ☐ Room P101 OG image: that room's photo (specific to room)
> ☐ OG:title unique per page
> ☐ OG:description unique per page
> ☐ OG:url: matches current page URL (canonical)
> ☐ OG:type: "website" homepage, "product" room pages
> ☐ Twitter card: "summary_large_image" on all marketing pages
> ☐ WhatsApp link preview: correct title + description + image (via OG)
```

### JSON-LD Structured Data
```
> ☐ Homepage JSON-LD: @type: Hotel
    — name: "The Rooms"
    — url: "https://therooms.in"
    — address: full address
    — geo: lat/long coordinates
    — starRating: 3
    — priceRange: ₹₹ (2 budget indicators)
    — amenityFeature: at least 6 amenities
> ☐ Rooms listing JSON-LD: @type: ItemList
    — itemListElement: all 36 rooms listed with position + name + url
> ☐ Room S101 JSON-LD: @type: HotelRoom
    — name: "Studio S101"
    — description: matches room description
    — accommodationType: [Studio]
    — occupancy: { maximum: 2 }
    — offers: { price: 999, priceCurrency: INR }
> ☐ FAQ page JSON-LD: @type: FAQPage
    — mainEntity: array of all 10 FAQs with question + answer
> ☐ BreadcrumbList on room pages: Home → Rooms → Studio S101
```

### Technical SEO
```
> ☐ robots.txt: "Allow: /" for all crawlers
> ☐ robots.txt: sitemap URL = https://therooms.in/sitemap.xml
> ☐ sitemap.xml: accessible at /sitemap.xml
> ☐ sitemap.xml: contains all pages (home, rooms, pricing, amenities, contact, faq)
> ☐ sitemap.xml: contains all 36 room detail URLs
> ☐ sitemap.xml: contains all pricing + amenities + contact URLs
> ☐ sitemap.xml: lastmod date set (current date for dynamic pages)
> ☐ sitemap.xml: priority: 1.0 for home, 0.8 for rooms, 0.6 for static pages
> ☐ <link rel="canonical">: every page has self-referential canonical URL
> ☐ 404 page: custom page with hotel branding + navigation back to home
> ☐ 500 page: "Something went wrong" with app name
> ☐ HTTPS: all subdomains load via HTTPS (green padlock in browser bar)
> ☐ HTTP/2: enabled on server
> ☐ DNS: all 6 subdomains resolve via Cloudflare/CDN
```

### Core Web Vitals
```
> ☐ Mobile-Friendly Test: https://search.google.com/test/mobile → PASS
> ☐ Lighthouse (homepage): Performance ≥ 80 | Accessibility ≥ 90 | Best Practices = 100
> ☐ Lighthouse (room detail P101): Performance ≥ 75
> ☐ Lighthouse (booking confirmation): Performance ≥ 70
> ☐ LCP (hero image): < 2.5s
    — Hero image preloaded: <link rel="preload">
    — Hero image sized correctly: 1920×1080 (not 4000px original)
    — Hero image WebP format
> ☐ CLS: < 0.1
    — All images have explicit width + height attributes
    — No dynamically injected content above fold
    — Font sizes stable (no FOUT — font-display: swap)
    — No lazy loading on above-fold images
> ☐ INP: < 200ms
    — Heavy JS interactions: debounced
    — Booking form: no blocking operations on button press
> ☐ Mobile: passes https://web.dev/measure for all viewport sizes
```

### Images
```
> ☐ All images: Next.js <Image> component (automatic optimization)
> ☐ All images: WebP format output (Next.js handles conversion)
> ☐ All images: explicit width + height (prevents CLS)
> ☐ All images: alt text (room photo alt="Studio Room S101 - spacious with modern amenities")
> ☐ Hero image: minimum 1920px wide × 1080px tall (for OG sharing)
> ☐ OG images for individual rooms: their specific room photo ≥ 1200×630px
> ☐ Logos: SVG format where possible (crisp at any size)
> ☐ Room gallery: first image prioritized + priority loading flag
> ☐ Images below fold: lazy loading (Next.js Image handles this)
```

### Performance
```
> ☐ Font loading: preconnect to fonts.googleapis.com + gstatic.com
> ☐ Fonts: display=swap (prevents FOUC)
> ☐ CSS: no render-blocking stylesheets (all async or inline for critical)
> ☐ JS: no render-blocking scripts (async or defer on non-critical)
> ☐ API routes:
    — Room availability: < 500ms response time
    — Room detail: < 300ms response time
    — Booking creation: < 2s (includes payment initiation)
> ☐ Booking form: no network calls on every keystroke (debounced)
> ☐ ISR: rooms listing revalidates every 60 seconds (not stale for hours)
</details>
> ☐ First Contentful Paint: < 1.8s (mobile, 4G)
> ☐ Time to Interactive: < 3.5s (mobile)
```

### Local SEO (India Market)
```
> ☐ Google Business Profile: hotel claimed and verified
> ☐ Business listing: name, address, phone, hours "Open 24 hours" consistent with website
> ☐ Reviews: "Rated 4.2 stars (site generated)" text
> ☐ Add Google Reviews widget on homepage (if verified)
> ☐ Address on website: exact match with Google Business Profile
> ☐ Phone on website: consistent +91 format (+91-XXXXXXXXXX)
> ☐ Map embed: Google Maps with correct pin at hotel address
> ☐ Phone link on mobile: <a href="tel:+91XXXXXXXXXX"> all devices tap-to-call
> ☐ WhatsApp link: https://wa.me/91XXXXXXXXXX (with hotel number)
> ☐ Structured data for local: geo coordinates match Google Business Profile
```

### Content Quality
```
> ☐ No duplicate content across pages
> ☐ Each room detail page: unique description (unique facts by room number)
> ☐ No placeholder text (no "Lorem ipsum", no "Coming soon", no "TBD")
> ☐ Pricing: exact figures match spec (₹999/₹1,799/₹1,999/₹2,999/₹29,999/₹39,999)
> ☐ Terms and Conditions: complete, not placeholder
> ☐ Privacy Policy: complete (per India DPDP Act)
> ☐ Cancellation policy: clearly stated in booking flow + on FAQ page
> ☐ Contact info: phone, email, WhatsApp all consistent
> ☐ Footer: complete (© 2026, GST number, links to T&C + Privacy)
```

---

## Final Sign-Off

After completing all items in all 5 checklists:

```
□ □ □ All sections marked ✅ in Master Integration Checklist
□ □ □ Front Office Dashboard Checklist: 100% ✅
□ □ □ Admin Dashboard Checklist: 100% ✅
□ □ □ Guest Portal Checklist: 100% ✅
□ □ □ Super Admin Dashboard Checklist: 100% ✅
□ □ □ SEO Verification Checklist: 100% ✅

□ □ □ Payment routes: all verified (IDFC → DB → Invoice → Email)
□ □ □ No gaps in user flows: guest booked → checked-in → checked-out → invoiced → review
□ □ □ No flow gaps: walk-in → check-in → check-out → night audit → reports
□ □ □ Document chain: upload at FO → verify → link to booking → auto-delete at 90 days
□ □ □ Pricing: all amounts match spec exactly per room type + occupancy
□ □ □ Discount application: validates → shows in breakdown → saved on booking → reflected in reports
□ □ □ System alerts: payment failure → system health failure → backup failure → super admin notified

System Status: READY FOR PRODUCTION ✅
Date Completed: ___________________
Completed By: ___________________
```

---

*Document Version: 1.0 | Last Updated: 2026-05-29 | Author: Mavis + Jnan*
*This checklist suite verifies the complete The Rooms Hotel Management System*
