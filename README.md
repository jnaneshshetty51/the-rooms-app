# The Rooms — Modern Hospitality PMS & Booking Engine

<p align="center">
  <img src="logo.png" alt="The Rooms Logo" width="220" />
</p>

<p align="center">
  <strong>An enterprise-grade, multi-tenant Property Management System (PMS) and hospitality booking platform built with Next.js 15, Turborepo, TypeScript, and Prisma.</strong>
</p>

<p align="center">
  <a href="#visual-showcase"><img src="https://img.shields.io/badge/Screenshots-Available-brightgreen?style=flat-square" alt="Screenshots" /></a>
  <a href="docs/PROJECT_STATUS.md"><img src="https://img.shields.io/badge/Project_Stage-Production_Ready-blue?style=flat-square" alt="Project Stage" /></a>
  <img src="https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Prisma-5.22-38bdf8?style=flat-square&logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Turborepo-Monorepo-ef4444?style=flat-square&logo=turborepo" alt="Turborepo" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript" alt="TypeScript" />
</p>

---

> 📸 **Want to see what the application looks like without deploying?**  
> Check out the complete [**Visual Project Status & Screenshot Tour**](docs/PROJECT_STATUS.md).

---

## 🏛️ Monorepo Architecture

The repository is organized into **5 specialized web applications** and **8 shared packages**:

```text
├── apps/
│   ├── web/            # Public marketing site, room catalogue & direct booking engine (Port 3000)
│   ├── guest-portal/   # Guest self-service PWA with magic links, digital check-in & add-ons (Port 3001)
│   ├── front-office/   # Front desk PMS: check-in, check-out, room matrix, cashiering & night audit (Port 3002)
│   ├── admin/          # Hotel manager PMS: occupancy, housekeeping dispatcher, maintenance & reports (Port 3003)
│   └── super-admin/    # Multi-property platform governance, partner onboarding & tenant analytics (Port 3004)
│
├── packages/
│   ├── db/             # Prisma schema, migrations, seed data & repository queries
│   ├── auth/           # NextAuth v5 configuration, credentials provider & magic links
│   ├── ui/             # Reusable design system, styled Tailwind components & icons
│   ├── api/            # Standardized API response helpers (ok, created, badRequest, serverError)
│   ├── types/          # Shared TypeScript types and enums across all apps
│   ├── payments/       # IndusInd, Razorpay & Cash payment processing + paise conversion
│   ├── email/          # Transactional email templates via Resend
│   └── document/       # PDF invoice & receipt generator
```

---

## 📸 Visual Showcase

Here is a preview of the core portals running in development against our seed database:

| Public Booking Portal | Front Office Operations |
|---|---|
| ![Web Landing](docs/screenshots/01_web_landing.png) | ![Front Office Dashboard](docs/screenshots/04_front_office_dashboard.png) |

| Hotel Admin PMS | Super Admin Multi-Property Platform |
|---|---|
| ![Admin Dashboard](docs/screenshots/07_admin_dashboard.png) | ![Super Admin Dashboard](docs/screenshots/11_super_admin_dashboard.png) |

| Guest Mobile Portal | Room Management Matrix |
|---|---|
| ![Guest Dashboard](docs/screenshots/14_guest_portal_dashboard.png) | ![Admin Rooms](docs/screenshots/08_admin_rooms.png) |

👉 **[See All 15 High-Resolution Screenshots in PROJECT_STATUS.md](docs/PROJECT_STATUS.md)**

---

## ⚡ Key Capabilities & Business Logic

- **Automated Long-Stay Pricing:** Studio rooms booked for ≥28 nights automatically switch to monthly rates (`packages/db/src/pricing.ts`).
- **Synchronized Room & Booking Status:** When a guest checks in, the room automatically becomes `OCCUPIED`. When checked out or cancelled, it returns to `VACANT` (`packages/db/src/queries/bookingQueries.ts`).
- **Night Audit Automation:** Daily automatic charge posting, no-show penalty enforcement, and end-of-day revenue reconciliation.
- **Strict Decimal Precision:** Financial amounts are stored as `Prisma.Decimal(10,2)` in INR with dedicated paise helpers for payment gateways.
- **Multi-Role Security:** Granular access boundaries enforce role separation between `GUEST`, `FRONT_OFFICE`, `ADMIN`, and `SUPER_ADMIN`.
- **Offline & PWA Ready:** Front-office and guest portals support service workers and offline fallback modes.

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20.0.0
- pnpm ≥ 10.0.0
- Docker & Docker Compose (or local PostgreSQL 16)

### Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   git clone https://github.com/jnaneshshetty51/the-rooms-app.git
   cd the-rooms-app
   pnpm install
   ```

2. **Start Database & Services:**
   ```bash
   docker compose up -d postgres redis
   ```

3. **Initialize Database:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

4. **Run All Apps in Dev Mode:**
   ```bash
   pnpm dev
   ```

### Default Login Credentials

| Role | Portal URL | Email | Password |
|---|---|---|---|
| **Super Admin** | `http://localhost:3004` | `superadmin@therooms.in` | `SuperAdmin@2026` |
| **Hotel Admin** | `http://localhost:3003` | `admin@therooms.in` | `Admin@2026` |
| **Front Office** | `http://localhost:3002` | `fo@therooms.in` | `FrontOffice@2026` |
| **Guest Portal** | `http://localhost:3001` | `testguest@example.com` | Magic Link or `Guest@2026` |
| **Public Site**  | `http://localhost:3000` | *Public Access* | *No login needed* |

---

## 📄 License
Private & Proprietary — All rights reserved.
