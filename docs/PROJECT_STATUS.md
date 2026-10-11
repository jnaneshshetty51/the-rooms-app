# The Rooms — Project Status & Visual Showcase

> **Current Stage: Production-Ready Monorepo (Pre-Deployment)**  
> **Status:** All core portals, micro-apps, Prisma ORM database models, and role-based workflows are fully implemented, verified, and operational locally.

---

## Executive Summary

**The Rooms** is an enterprise-grade Property Management System (PMS) and hospitality booking platform designed as a Turborepo monorepo. It features **5 dedicated Next.js applications** and shared domain packages for database (Prisma + PostgreSQL), authentication (NextAuth v5), background workflows, invoices, and payments.

### Monorepo Architecture Overview

| Application / Portal | Port | Target Audience | Primary Capabilities |
|---|---|---|---|
| **Public Web Portal** (`apps/web`) | `3000` | Prospective Guests | Responsive marketing site, real-time room availability, pricing engine, booking flow |
| **Guest Self-Service Portal** (`apps/guest-portal`) | `3001` | In-house & Booked Guests | Passwordless magic-link authentication, mobile-first PWA, digital check-in, folio invoices, add-ons, express checkout |
| **Front Office Operations** (`apps/front-office`) | `3002` | Front Desk Agents | Daily arrivals/departures, room status matrix, walk-in reservations, night audit & folio charges, payment collection |
| **Hotel Admin PMS** (`apps/admin`) | `3003` | Hotel General Managers | Inventory & seasonal rates, housekeeping task assignment, maintenance tracking, damage assessments, financial reports |
| **Super Admin Platform** (`apps/super-admin`) | `3004` | Multi-Property Executives | Cross-property oversight, partner management, tenant governance, platform analytics, system health audits |

---

## Visual Tour of the Portals

The following high-resolution screenshots were captured from the active running applications against the live database:

### 1. Public Web Portal (`apps/web`)

Modern, high-conversion guest-facing portal with live room availability, transparent pricing, and instant booking capabilities.

#### Landing Page
![Public Web Portal — Landing Page](screenshots/01_web_landing.png)

#### Room Showcase & Selection
![Public Web Portal — Rooms Showcase](screenshots/02_web_rooms.png)

---

### 2. Front Office Operations (`apps/front-office`)

Dedicated desktop & tablet workflow for hotel receptionists to handle room allocations, guest arrivals, night audit, and folios.

#### Staff Authentication
![Front Office — Staff Login](screenshots/03_front_office_login.png)

#### Live Operations Dashboard
![Front Office — Operations Dashboard](screenshots/04_front_office_dashboard.png)

#### Room Matrix & Housekeeping Status
![Front Office — Room Matrix](screenshots/05_front_office_rooms.png)

---

### 3. Hotel Management & Admin PMS (`apps/admin`)

Full administrative suite for property managers to oversee occupancy, revenue, staff assignments, and room readiness.

#### Manager Authentication
![Admin Portal — Login](screenshots/06_admin_login.png)

#### Property Performance Dashboard
![Admin Portal — Performance Dashboard](screenshots/07_admin_dashboard.png)

#### Room Inventory Management
![Admin Portal — Room Management](screenshots/08_admin_rooms.png)

#### Housekeeping Task Dispatcher & Progress
![Admin Portal — Housekeeping Operations](screenshots/09_admin_housekeeping.png)

---

### 4. Super Admin Multi-Property Platform (`apps/super-admin`)

Multi-tenant management portal for chain owners, investors, and platform administrators.

#### Super Admin Login
![Super Admin — Authentication](screenshots/10_super_admin_login.png)

#### Global Governance & Multi-Property Metrics
![Super Admin — Governance Dashboard](screenshots/11_super_admin_dashboard.png)

#### Property & Partner Portfolio
![Super Admin — Property Portfolio](screenshots/12_super_admin_properties.png)

---

### 5. Guest Portal PWA (`apps/guest-portal`)

Mobile-first PWA for staying guests to manage their stay digitally.

#### Secure Magic-Link Login
![Guest Portal — Magic Link Login](screenshots/13_guest_portal_login.png)

#### Guest Dashboard & Stay Hub
![Guest Portal — Dashboard](screenshots/14_guest_portal_dashboard.png)

#### My Bookings & Stay Details
![Guest Portal — My Bookings](screenshots/15_guest_portal_bookings.png)

---

## Completed Feature Matrix

| Functional Area | Stage | Notes |
|---|---|---|
| **Database Schema & Prisma ORM** | **100% Complete** | 40+ tables covering Rooms, Bookings, Guests, Folios, Invoices, Payments, Housekeeping, Night Audit, Disputes, and Discounts. |
| **Authentication & Role Guards** | **100% Complete** | NextAuth v5 with edge middleware. Role-specific barriers preventing unauthorized horizontal and vertical access. |
| **Public Booking Engine** | **100% Complete** | Room filtering, real-time rate calculator (daily + monthly auto-switch for ≥28 nights), GST calculations, coupon validation. |
| **Front Office PMS Operations** | **100% Complete** | Real-time occupancy KPIs, arrivals/departures feed, room board, check-in, check-out, and folio settlements. |
| **Housekeeping & Maintenance** | **100% Complete** | Task allocation, priority cleaning flags, maintenance request lifecycle, room status sync. |
| **Night Audit Automation** | **100% Complete** | Daily room charge posting, no-show automated penalty processing, end-of-day revenue reconciliation. |
| **Multi-Property Governance** | **100% Complete** | Tenant property onboarding, audit logs, platform-wide analytics, system health monitors. |
| **Guest Self-Service & PWA** | **100% Complete** | Magic-link login, digital registration card signing, service requests, add-on purchasing, invoices PDF. |

---

## How to Run Locally

### 1. Prerequisites
- Node.js ≥ 20.0.0
- pnpm ≥ 10.0.0
- Docker & Docker Compose (or local PostgreSQL 16)

### 2. Environment & Database Setup
```bash
# Clone the repository
git clone https://github.com/jnaneshshetty51/the-rooms-app.git
cd the-rooms-app

# Install dependencies
pnpm install

# Start infrastructure (PostgreSQL & Redis)
docker compose up -d postgres redis

# Push Prisma schema and seed initial data
pnpm db:push
pnpm db:seed
```

### 3. Launch Development Servers
```bash
# Start all 5 portals simultaneously with Turborepo:
pnpm dev

# Or run individual portals:
pnpm dev:web          # Port 3000 (or 3010)
pnpm dev:guest        # Port 3001
pnpm dev:front-office # Port 3002
pnpm dev:admin        # Port 3003
pnpm dev:super-admin  # Port 3004
```

### 4. Default Seeded Accounts
- **Super Admin:** `superadmin@therooms.in` / `SuperAdmin@2026`
- **Hotel Admin:** `admin@therooms.in` / `Admin@2026`
- **Front Office:** `fo@therooms.in` / `FrontOffice@2026`
- **Guest Account:** `testguest@example.com` (Magic Link or `Guest@2026`)
