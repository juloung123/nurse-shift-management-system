// ===========================================
// Nurse Shift & OT Management System — Types
// ===========================================

export type UserRole = 'nurse' | 'manager' | 'admin' | 'pending';
export type SummaryStatus = 'draft' | 'finalized';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  sched_start: string; // ISO timestamp
  sched_end: string;
  actual_start: string | null;
  actual_end: string | null;
  calculated_afternoon_hours: number;
  calculated_ot_hours: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MonthlySummary {
  id: string;
  user_id: string;
  month_period: string; // e.g. "2026-02"
  prev_month_afternoon_carry_over: number;
  prev_month_ot_carry_over: number;
  total_afternoon_hours: number;
  total_ot_hours: number;
  paid_afternoon_shifts: number;
  paid_ot_shifts: number;
  remaining_afternoon_carry_over: number;
  remaining_ot_carry_over: number;
  status: SummaryStatus;
  created_at: string;
  updated_at: string;
}

export interface ShiftBreakdown {
  normalHours: number;
  afternoonHours: number;
  otHours: number;
}

export interface PeriodRange {
  start: Date; // 16th of previous month
  end: Date;   // 15th of current month (23:59:59)
  label: string;
  periodKey: string; // e.g. "2026-02"
}

export interface MonthlyAccumulation {
  totalAfternoonHours: number;
  totalOtHours: number;
  afternoonShifts: number; // full 8-hour blocks
  otShifts: number;
  afternoonRemainder: number; // hours left over
  otRemainder: number;
}

export interface WardSettings {
  id: string;
  period_key: string;
  working_days: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export type PasswordResetStatus = 'pending' | 'resolved' | 'rejected';

// A nurse's request to have their password reset. Admin resolves it from the queue.
export interface PasswordResetRequest {
  id: string;
  user_id: string;
  status: PasswordResetStatus;
  note: string | null;
  requested_at: string;   // ISO 8601
  resolved_at: string | null;
  resolved_by: string | null;
}

// PasswordResetRequest joined to the owning profile — the shape returned by the
// admin "pending requests" query.
export interface PasswordResetRequestWithProfile extends PasswordResetRequest {
  profiles: {
    full_name: string;
    username: string;
    role: UserRole;
  } | null;
}
