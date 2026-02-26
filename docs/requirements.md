# Requirements — Nurse Shift & OT Management System (ShiftCare)

## 1. Project Overview

| Item | Detail |
|---|---|
| **Product Name** | ShiftCare — ระบบบันทึกเวร |
| **Target Users** | Thai Nurses (~80 users) and Ward Managers (Admins) |
| **Platform** | Mobile-First Web Application (Responsive) |
| **Core Concept** | Replace a manual paper logbook with a digital system that calculates "Afternoon Shift Pay" and "Overtime (OT) Pay" based on 8-hour blocks |
| **Monthly Cycle** | 16th of current month → 15th of next month |

---

## 2. User Stories

### 2.1 Authentication

| ID | Role | User Story | Acceptance Criteria |
|---|---|---|---|
| US-01 | All | As a user, I want to log in with a username and password so that I can access my data securely. | ① Login form accepts username + password. ② Invalid credentials show Thai error message. ③ Successful login redirects to home page. |
| US-02 | All | As a user, I want to be automatically redirected to the login page if I'm not authenticated. | ① Middleware intercepts unauthenticated requests. ② Redirect preserves the intended destination. |
| US-03 | All | As a user, I want to sign out of the system. | ① Sign-out clears session and redirects to `/login`. |

### 2.2 Nurse — Shift Logging

| ID | Role | User Story | Acceptance Criteria |
|---|---|---|---|
| US-10 | Nurse | As a nurse, I want to see a list of my shifts for the current pay period (16th–15th) so I can review my schedule. | ① Default period is the current active period. ② Each day in the period is shown as a card (filled or empty). ③ Filled cards show schedule, actual times, afternoon & OT badges. |
| US-11 | Nurse | As a nurse, I want to add a new shift entry for a specific date so I can log my work. | ① Clicking a date opens the entry form. ② Form has time pickers for scheduled start/end and actual start/end. ③ Overnight shift toggle (+1 day) is available. ④ Notes text area is provided. |
| US-12 | Nurse | As a nurse, I want to see real-time projected Afternoon and OT hours as I fill in the form so I can verify correctness before saving. | ① Changing any time input instantly updates the "คำนวณอัตโนมัติ" preview. ② Preview shows Normal, Afternoon (บ่าย), and OT hours. |
| US-13 | Nurse | As a nurse, I want to edit or delete an existing shift entry. | ① Tapping a filled card opens the form pre-populated. ② A delete button is available for existing entries. ③ Save updates the card immediately. |
| US-14 | Nurse | As a nurse, I want to select different pay periods so I can review past months. | ① Period selector dropdown shows 12 months (6 past, 5 future + current). ② Selecting a period reloads the shift list and stats. |
| US-15 | Nurse | As a nurse, I want to see my carry-over hours from the previous month and my current accumulation. | ① Header shows "ยกมาจากเดือนก่อน" with afternoon & OT carry-over hours. ② Two summary cards show total accumulated hours, full shifts (÷8), and remainder. |

### 2.3 Admin — Month-End Management

| ID | Role | User Story | Acceptance Criteria |
|---|---|---|---|
| US-20 | Admin | As an admin, I want to see a list of all nurses with their accumulated Afternoon and OT hours for a selected period. | ① List shows every nurse profile. ② Each row displays total afternoon hours, OT hours, and full-shift counts. ③ Finalized nurses show a green checkmark. |
| US-21 | Admin | As an admin, I want to search for a specific nurse by name or username. | ① Search input filters the nurse list in real-time. |
| US-22 | Admin | As an admin, I want to finalize a nurse's month-end pay by specifying how many 8-hour shifts to pay out. | ① Clicking a nurse opens the finalization modal. ② Modal shows breakdown: carry-over + earned = total available. ③ Input fields for "Pay X Afternoon Shifts" and "Pay Y OT Shifts" with max validation. ④ System auto-calculates remaining carry-over. ⑤ "ยืนยันและปิดงวด" saves and marks the summary as `finalized`. |
| US-23 | Admin | As an admin, I want to see overall summary stats (total nurses, total afternoon hours, total OT hours, finalization progress). | ① Three summary cards at top: nurse count, total afternoon, total OT. ② Progress badge shows "X / Y" finalized. |
| US-24 | Admin | As an admin, I also want to access the nurse shift logging view for my own shifts. | ① Bottom navigation shows "หน้าหลัก" (home) and "จัดการเวร" (admin). ② Home route renders NurseHome if admin also has shifts. |

---

## 3. Functional Requirements

### FR-01: Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| FR-01.1 | System must support username/password login via Supabase Auth. | Must |
| FR-01.2 | Usernames are mapped to `username@nurse.local` email format internally. | Must |
| FR-01.3 | Unauthenticated requests to any route except `/login` must redirect to `/login`. | Must |
| FR-01.4 | Authenticated requests to `/login` must redirect to `/`. | Must |
| FR-01.5 | A profile record must be auto-created on signup via database trigger. | Must |
| FR-01.6 | Two roles exist: `nurse` and `admin`. | Must |
| FR-01.7 | Admin-only routes (`/admin`) must reject non-admin users with redirect. | Must |

### FR-02: Pay Period Logic (16th → 15th)

| ID | Requirement | Priority |
|---|---|---|
| FR-02.1 | A "period" is defined as 16th of month N through 15th of month N+1. | Must |
| FR-02.2 | Period key format is `"YYYY-MM"` where MM is the ending month. | Must |
| FR-02.3 | A date on or after the 16th belongs to the **next** month's period. | Must |
| FR-02.4 | A date on or before the 15th belongs to the **current** month's period. | Must |
| FR-02.5 | Period labels use Thai Buddhist calendar year (+543) and abbreviated Thai month names. | Must |

### FR-03: Shift Entry & Calculation

| ID | Requirement | Priority |
|---|---|---|
| FR-03.1 | Each nurse can have at most one shift entry per calendar date (UNIQUE constraint). | Must |
| FR-03.2 | Each entry stores: scheduled start/end, actual start/end, notes. | Must |
| FR-03.3 | **Afternoon hours** = overlap between **scheduled** time range and the 16:00–00:00 window. | Must |
| FR-03.4 | **OT hours** = actual end time − scheduled end time (when actual > scheduled). | Must |
| FR-03.5 | Overnight shifts must be supported (end time crosses midnight). | Must |
| FR-03.6 | Afternoon and OT hours are auto-calculated on save (server-side). | Must |
| FR-03.7 | Real-time preview must update on the client as the user adjusts time pickers. | Must |

### FR-04: Monthly Accumulation & Carry-Over

| ID | Requirement | Priority |
|---|---|---|
| FR-04.1 | Monthly accumulation = previous carry-over + sum of current period's hours. | Must |
| FR-04.2 | A "full shift" = 8 accumulated hours. | Must |
| FR-04.3 | Remainder hours (< 8) carry over to the next month. | Must |
| FR-04.4 | Afternoon shift pay is money-only (cannot be exchanged for days off). | Must |
| FR-04.5 | OT pay can be money or exchanged for days off (admin decides). | Should |

### FR-05: Admin Finalization

| ID | Requirement | Priority |
|---|---|---|
| FR-05.1 | Admin can set the number of afternoon shifts and OT shifts to pay out. | Must |
| FR-05.2 | Paid shifts × 8 hours are deducted from the total. | Must |
| FR-05.3 | Remaining hours become the carry-over for the next period. | Must |
| FR-05.4 | Finalized summaries are marked with status `'finalized'`. | Must |
| FR-05.5 | Monthly summary is stored via upsert on `(user_id, month_period)`. | Must |

### FR-06: Row Level Security

| ID | Requirement | Priority |
|---|---|---|
| FR-06.1 | Nurses can only read/write their own `shifts` records. | Must |
| FR-06.2 | Nurses can only read their own `monthly_summaries`. | Must |
| FR-06.3 | Admins can read all `profiles`, `shifts`, and `monthly_summaries`. | Must |
| FR-06.4 | Only admins can insert/update `monthly_summaries`. | Must |

### FR-07: UI / UX

| ID | Requirement | Priority |
|---|---|---|
| FR-07.1 | Mobile-first design (optimized for 375–430px viewport). | Must |
| FR-07.2 | Card-based layout for shift entries (not table). | Must |
| FR-07.3 | Thai language for all UI labels with English subtitles. | Must |
| FR-07.4 | Bottom navigation for admin role. | Should |
| FR-07.5 | Premium visual design with gradient accents, micro-animations, and color-coded badges. | Should |

---

## 4. Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NFR-01 | Target response time < 2s for page loads on 4G connection. | Should |
| NFR-02 | Support ~80 concurrent users on Supabase Free Tier. | Must |
| NFR-03 | Data at rest encrypted via Supabase default settings. | Must |
| NFR-04 | Session tokens managed via HTTP-only cookies (Supabase SSR). | Must |
| NFR-05 | Accessible on iOS Safari, Android Chrome, and desktop browsers. | Must |
