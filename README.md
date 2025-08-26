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
````
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';


// ------------ EDIT THESE VALUES -------------
const ADMIN_NAME = '';
const ADMIN_EMAIL = '';
const ADMIN_PHONE = '';
const ADMIN_PASSWORD = '';
const ADMIN_CONFIRM_PASSWORD = '';
// Optionally control bcrypt rounds via env (default 12)
const HASH_ROUNDS = Number(process.env.HASH_ROUNDS ?? 12);
// -------------------------------------------

// Load .env first, then override with .env.local if present
const rootDir = process.cwd();
const envPath = path.join(rootDir, '.env');
const envLocalPath = path.join(rootDir, '.env.local');
dotenv.config({ path: envPath });
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: true });
}

type Role = 'owner' | 'staff' | 'admin';

async function connectDB() {
  const uri =
    process.env.DATABASE_URL ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL;

  if (!uri) {
    console.error('❌ DATABASE_URL (or MONGODB_URI/MONGO_URL) is missing in environment.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      autoIndex: false,
    });
  } catch (err: any) {
    console.error('❌ Failed to connect to MongoDB:', err?.message || err);
    process.exit(1);
  }
}

function validateInputs() {
  if (!ADMIN_NAME || ADMIN_NAME.trim().length < 2) {
    console.error('❌ ADMIN_NAME is required.');
    process.exit(1);
  }
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌ Invalid ADMIN_EMAIL:', ADMIN_EMAIL);
    process.exit(1);
  }
  if (typeof ADMIN_PHONE !== 'string' || ADMIN_PHONE.trim().length < 8) {
    console.error('❌ Invalid ADMIN_PHONE:', ADMIN_PHONE);
    process.exit(1);
  }
  if (!ADMIN_PASSWORD || ADMIN_PASSWORD.length < 8) {
    console.error('❌ ADMIN_PASSWORD must be at least 8 characters.');
    process.exit(1);
  }
  if (ADMIN_PASSWORD !== ADMIN_CONFIRM_PASSWORD) {
    console.error('❌ Password and Confirm Password do not match.');
    process.exit(1);
  }
}

async function createAdmin() {
  const email = ADMIN_EMAIL.trim().toLowerCase();

  // 1) If user already exists: only upgrade role (do not touch password)
  const existing = await User.findOne({ email }).lean();
  if (existing) {
    if ((existing as any).role !== 'admin') {
      const updated = await User.findOneAndUpdate(
        { email },
        { $set: { role: 'admin' as Role } },
        { new: true }
      );
      console.log('✅ Existing user found. Role updated to admin:', {
        id: updated?._id?.toString?.(),
        email: updated?.email,
        role: updated?.role,
      });
      return;
    }
    console.log('ℹ️  Admin user already exists:', {
      id: (existing as any)?._id?.toString?.(),
      email,
    });
    return;
  }

  // 2) Create brand new admin user with hashed password
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, HASH_ROUNDS);

  const doc: any = {
    name: ADMIN_NAME.trim(),
    email,
    phone: ADMIN_PHONE.trim(),
    role: 'admin' as Role,
    passwordHash, // <-- your schema requires this
  };

  try {
    const created = await new (User as any)(doc).save();
    console.log('✅ Admin user created:', {
      id: created?._id?.toString?.(),
      email: created?.email,
      role: created?.role,
      phone: created?.phone,
      name: created?.name,
    });
  } catch (err: any) {
    console.error('❌ Failed to create admin:', err?.message || err);
    process.exit(1);
  }
}

(async function main() {
  validateInputs();
  await connectDB();
  try {
    await createAdmin();
  } catch (err: any) {
    console.error('❌ Operation failed:', err?.message || err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => void 0);
  }
})();
````

### Run:

``npm run admin``

