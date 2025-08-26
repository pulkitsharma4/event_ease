# EventEase — Mini Event Management App

A polished full-stack event manager with roles (**Admin, Staff, Owner**), secure auth + sessions, event CRUD, public event pages, RSVP, attendee tracking, and CSV export.  
Built with **Next.js 15 (App Router, TypeScript)**, **Tailwind v4 + shadcn/ui**, and **MongoDB (Mongoose)** following strict **MVC** (UI → Controller → Service → Model).

---

## Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture (MVC)](#architecture-mvc)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Quick Start](#quick-start)
- [Scripts](#scripts)
- [API Overview](#api-overview)
- [Roles & Auth](#roles--auth)
- [Health Checks](#health-checks)
- [Caching & Freshness](#caching--freshness)
- [Security Notes](#security-notes)
- [Troubleshooting](#troubleshooting)
- [Deployment](#deployment)
- [License](#license)
- [Credits](#credits)

---

## Features
- **Auth & Sessions**: Email signup/login, JWT in HttpOnly cookie `eventease_session`, protected routes via middleware.
- **Roles**: `owner` (default on signup), `staff`, `admin` (set manually).
- **Events**: Create/read (edit/delete planned), capacity, booked slots, **`assigned_to`** (optional staff assignment).
- **Public**: `/` with **Trending**, `/events` listing, `/event/[id]` (detail planned).
- **RSVP**: Public endpoint (name, email, quantity), unique per `(eventId,email)`, timestamps stored.
- **Dashboard**: Tabs — **Events**, **My events** (owner+staff), **Assigned** (staff).
- **Health**: `/health` and `/api/health` for probes.
- **UI/UX**: Tailwind + shadcn/ui, responsive, navbar uses `/public/logo.svg`.

---

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind v4, shadcn/ui
- **Backend**: Next.js Route Handlers (server), Controllers + Services
- **DB**: MongoDB Atlas (Mongoose)
- **Runtime**: Node 22.16
- **Optional**: Recharts, Framer Motion

---

## Architecture (MVC)

```text
[Pages / Components]  →  [Controllers]  →  [Services]  →  [Models (Mongoose)]
(App Router routes)       (HTTP shape)       (business)     (MongoDB Atlas)
````

### Route handlers (src/app/**/route.ts) import a controller.
### Controllers validate/session-gate and call services.
### Services implement business logic and use models for DB I/O.
### Public UI fetches public APIs to keep caching & boundaries sane.

## **Project Structure**

````text
src/
  app/
    page.tsx                      # Home (Hero + Trending)
    health/route.ts               # GET /health
    api/
      health/route.ts             # GET /api/health
      public/
        home/route.ts             # GET /api/public/home (trending)
        events/route.ts           # GET /api/public/events
        rsvp/route.ts             # POST /api/public/rsvp
        auth/
          signup/route.ts         # POST /api/public/auth/signup
          login/route.ts          # POST /api/public/auth/login
          logout/route.ts         # POST /api/public/auth/logout
      auth/
        events/
          my/route.ts             # GET /api/auth/events/my
          assigned/route.ts       # GET /api/auth/events/assigned (staff)
        events/route.ts           # POST /api/auth/events (create)

  controllers/
    eventController.ts
    authController.ts
    healthController.ts

  services/
    eventService.ts               # includes assigned_to + EventDTO mapping
    authService.ts
    healthService.ts

  models/
    User.ts                       # { role, emailVerified, phoneVerified, ... }
    Event.ts                      # { ownerId, title, slug, startsAt, capacity, bookedSlots, assigned_to? }
    RSVP.ts                       # { eventId, name, email, quantity } (unique: eventId+email)

  lib/
    db.ts                         # Mongo connection
    auth/session.ts               # readSession, cookie utils

  components/
    sections/
      Hero.tsx
      Trending.tsx                # fetches /api/public/home with cache: "no-store"
    ui/                           # shadcn components

  scripts/
    backfill-assigned-to.ts       # sets assigned_to: null on existing events
````

## Environment Variables
Create `.env.local`
````
# MongoDB Atlas
DATABASE_URL="mongodb+srv://<user>:<pass>@<cluster>/<db>?retryWrites=true&w=majority&appName=<app>"

# Auth
JWT_SECRET="replace-with-a-long-random-secret"
SESSION_COOKIE_NAME="eventease_session"

# Public (optional)
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
````

## Quick Start

````
# 1) Install deps
npm ci   # or: npm i

# 2) (Optional) Backfill assigned_to on older events
npx tsx src/scripts/backfill-assigned-to.ts

# 3) Dev
npm run dev   # → http://localhost:3000

# 4) Build & Start
npm run build
npm start
````
###  Sign up (defaults to owner), create a few events.

### Visit / while logged out → Trending shows live items.

### Visit /dashboard while logged in → tabs (Events / My events / Assigned).

## Scripts
### Backfill assigned_to on existing events:

``npx tsx src/scripts/backfill-assigned-to.ts``

## Roles & Auth

- Signup → role defaults to owner.

- Staff → sees items under Assigned (via assigned_to).

- Admin → set manually (DB/CLI). See below.

## How to Add Admin

- Never expose an HTTP endpoint for admin promotion.

### Script
``scripts\make-admin.ts``
````
// ------------ EDIT THESE VALUES -------------
const ADMIN_NAME = '';
const ADMIN_EMAIL = '';
const ADMIN_PHONE = '';
const ADMIN_PASSWORD = '';
const ADMIN_CONFIRM_PASSWORD = '';
// Optionally control bcrypt rounds via env (default 12)
const HASH_ROUNDS = Number(process.env.HASH_ROUNDS ?? 12);
// -------------------------------------------
````

### Run:

``npm run admin``

