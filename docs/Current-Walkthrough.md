# Current Walkthrough — ShiftCare System

> **Last Updated:** 2026-02-20  
> **Status:** Core system built and verified. Ready for user testing.

---

## 1. What Has Been Built

The **ShiftCare** system is a mobile-first web application that replaces paper-based shift and OT logging for Thai hospital nurses. The entire stack is functional:

| Layer | Technology | Status |
|---|---|---|
| Frontend | Next.js 14+ (App Router), Tailwind CSS, shadcn/ui | ✅ Built |
| Backend | Supabase (PostgreSQL + Auth + RLS) | ✅ Configured |
| Business Logic | TypeScript calculation engine | ✅ Implemented |
| Auth | Email/password via Supabase (username mapping) | ✅ Working |
| Deployment | Local dev server (`npm run dev`) | ✅ Running |

---

## 2. Project Structure

```
nurse-shift-management-system/
├── docs/
│   ├── requirements.md          # User stories & functional requirements
│   ├── schema.md                # Database schema & ER diagram
│   ├── api-spec.md              # API specification
│   └── Current-Walkthrough.md   # This file
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout (Thai locale, SEO)
│   │   ├── globals.css          # Premium teal theme + animations
│   │   ├── login/
│   │   │   └── page.tsx         # Login page (username/password)
│   │   └── (protected)/
│   │       ├── layout.tsx       # AppShell wrapper (header + nav)
│   │       ├── page.tsx         # Home — routes by role
│   │       └── admin/
│   │           └── page.tsx     # Admin dashboard (role-gated)
│   ├── components/
│   │   ├── AppShell.tsx         # Header bar + bottom nav
│   │   ├── ShiftCard.tsx        # Daily shift card (mobile-first)
│   │   ├── ShiftEntryForm.tsx   # Time pickers + real-time calc
│   │   ├── PeriodSelector.tsx   # 16th–15th period dropdown
│   │   ├── StatsHeader.tsx      # Carry-over + accumulation cards
│   │   ├── NurseHome.tsx        # Nurse main page
│   │   ├── AdminDashboard.tsx   # Admin nurse list + search
│   │   ├── AdminMonthEnd.tsx    # Finalization modal
│   │   └── ui/                  # shadcn/ui components (12 files)
│   ├── lib/
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── shift-calculations.ts # Afternoon & OT calculation engine
│   │   ├── date-utils.ts        # Period date logic + Thai formatting
│   │   └── supabase/
│   │       ├── client.ts        # Browser Supabase client
│   │       ├── server.ts        # Server Supabase client
│   │       ├── middleware.ts    # Session refresh logic
│   │       └── actions.ts       # Server Actions (CRUD)
│   └── middleware.ts            # Next.js auth middleware
├── .env.local                   # Supabase credentials
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 3. Supabase Configuration

| Setting | Value |
|---|---|
| **Project ID** | `qiuzhlarnkbcalbgnnmx` |
| **Region** | `ap-southeast-2` |
| **URL** | `https://qiuzhlarnkbcalbgnnmx.supabase.co` |
| **Tables** | `profiles`, `shifts`, `monthly_summaries` |
| **RLS** | Enabled on all tables |
| **Auth** | Email/password (mapped from `username@nurse.local`) |
| **Trigger** | Auto-creates profile on user signup |

---

## 4. Business Logic Summary

### Pay Period
- Runs from **16th of month N** to **15th of month N+1**
- Period key format: `"YYYY-MM"` (where MM = ending month)

### Afternoon Shift (เวรบ่าย)
- Counts **scheduled** hours overlapping 16:00–00:00
- Money-only payout in 8-hour blocks
- Remainder carries over

### Overtime (OT)
- Counts actual hours **beyond** scheduled end time
- Can be paid or exchanged for days off
- 8-hour blocks, remainder carries over

### Example
| Timeline | Category |
|---|---|
| Schedule: 12:00–20:00 | |
| Actual: 12:00–22:00 | |
| 12:00–16:00 | Normal (4 hrs) |
| 16:00–20:00 | **Afternoon (4 hrs)** — within schedule, after 16:00 |
| 20:00–22:00 | **OT (2 hrs)** — beyond schedule |

---

## 5. Build & Verification Results

| Check | Result |
|---|---|
| `npm run build` | ✅ Compiled successfully (1680.5ms) |
| Static routes | `○ /login`, `○ /_not-found` |
| Dynamic routes | `ƒ /` (home), `ƒ /admin` |
| Middleware | `ƒ Proxy` — auth redirect active |
| Login page (mobile 390×844) | ✅ Premium design verified |
| Dev server | ✅ Running at `http://localhost:3000` |

---

## 6. How to Test

### Step 1: Create Test Users

In the [Supabase Dashboard](https://supabase.com/dashboard/project/qiuzhlarnkbcalbgnnmx/auth/users), create users:

**Admin User:**
- Email: `admin1@nurse.local`
- Password: `Test1234!`
- User Metadata: `{"full_name": "หัวหน้าเวร สมศรี", "role": "admin"}`

**Nurse User:**
- Email: `nurse1@nurse.local`
- Password: `Test1234!`
- User Metadata: `{"full_name": "สมหญิง ใจดี", "role": "nurse"}`

### Step 2: Login

Open `http://localhost:3000` → redirects to `/login`
- Username: `admin1` (or `nurse1`)
- Password: `Test1234!`

### Step 3: Test Nurse Flow

1. Log in as `nurse1`
2. See the shift list for the current period (16th–15th)
3. Tap a date → opens ShiftEntryForm
4. Set schedule (e.g., 12:00–20:00) and actual (12:00–22:00)
5. Verify real-time calc shows: 4 hrs afternoon, 2 hrs OT
6. Save → card updates with badges

### Step 4: Test Admin Flow

1. Log in as `admin1`
2. See the admin dashboard with nurse list
3. Click a nurse → opens AdminMonthEnd modal
4. Set paid shifts and verify carry-over calculation
5. Click "ยืนยันและปิดงวด"

---

## 7. Known Limitations / Future Work

| Item | Status | Notes |
|---|---|---|
| Unit tests for calculation engine | 🔲 Not yet | Should test edge cases (overnight, midnight crossover) |
| Bulk shift import (CSV) | 🔲 Not yet | Useful for initial data migration from paper |
| Push notifications | 🔲 Not yet | Remind nurses to log shifts |
| PDF export for monthly reports | 🔲 Not yet | Required for payroll submission |
| Dark mode toggle | 🔲 Not yet | CSS variables ready, needs UI toggle |
| Internationalization (i18n) | 🔲 Not yet | Currently hardcoded Thai + English labels |
| Production deployment (Vercel) | 🔲 Not yet | Ready to deploy with `vercel` CLI |
