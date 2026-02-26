// =====================================================
// Shift Calculation Engine v2
// Handles Afternoon Shift (เวรบ่าย) & OT computation
// =====================================================
//
// Business Rules (current ward):
//
// AFTERNOON (เวรบ่าย):
//   1. Afternoon TRIGGERS only when shift end reaches 18:00
//   2. Once triggered, COUNT from 16:00 to shift end
//   3. Exception: shifts starting at 15:xx count from 15:00
//      immediately (no 18:00 trigger needed)
//   4. Post-midnight hours also count as afternoon
//
// OT:
//   1. OT = actual_hours - scheduled_hours
//   2. Can be NEGATIVE if actual < scheduled
//   3. Afternoon and OT CAN overlap
//
// All constants are read from shift-config.ts for easy changes.

import type { ShiftBreakdown, MonthlyAccumulation } from './types';
import { DEFAULT_SHIFT_CONFIG, type ShiftCalcConfig } from './shift-config';

/**
 * Get the hour (0-23) from a Date in local time.
 */
function getHour(d: Date): number {
    return d.getHours();
}

/**
 * Get total hours between two dates.
 */
function diffHours(start: Date, end: Date): number {
    return Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
}

/**
 * Round to 2 decimal places.
 */
function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Create a Date on the same day as `ref` at a specific hour.
 */
function sameDay(ref: Date, hour: number): Date {
    const d = new Date(ref);
    d.setHours(hour, 0, 0, 0);
    return d;
}

/**
 * Create a Date on the next day relative to `ref` at a specific hour.
 */
function nextDay(ref: Date, hour: number): Date {
    const d = new Date(ref);
    d.setDate(d.getDate() + 1);
    d.setHours(hour, 0, 0, 0);
    return d;
}

/**
 * Calculate afternoon hours based on the ACTUAL working time range.
 *
 * Rules (configurable via config):
 * - If shift start hour = earlyAfternoonStartHour (15):
 *     → count immediately from 15:00 to end
 * - Otherwise:
 *     → only count if shift end >= afternoonTriggerHour (18:00)
 *     → count from afternoonCountFromHour (16:00) to end
 *
 * Handles overnight shifts (crossing midnight).
 *
 * @param workStart - When work actually started
 * @param workEnd   - When work actually ended
 * @param config    - Calculation configuration
 * @returns Afternoon hours (float, rounded to 2dp)
 */
export function calculateAfternoonHours(
    workStart: Date,
    workEnd: Date,
    config: ShiftCalcConfig = DEFAULT_SHIFT_CONFIG
): number {
    if (workEnd <= workStart) return 0;

    const startHour = getHour(workStart);

    // Determine the afternoon counting start point
    let afternoonFrom: Date;
    let triggerRequired: boolean;

    if (startHour === config.earlyAfternoonStartHour) {
        // Shifts starting at 15:xx → count from 15:00 immediately
        afternoonFrom = sameDay(workStart, config.earlyAfternoonStartHour);
        triggerRequired = false;
    } else {
        // Normal shifts → count from 16:00, but only if reaching 18:00
        afternoonFrom = sameDay(workStart, config.afternoonCountFromHour);
        triggerRequired = true;
    }

    // Check trigger condition: shift end must reach the trigger hour
    if (triggerRequired) {
        // We need to check if the end time is >= triggerHour on the same day
        // OR if the shift crosses midnight (end is next day = definitely past 18:00)
        const triggerTime = sameDay(workStart, config.afternoonTriggerHour);

        // If shift doesn't cross midnight and ends before trigger → no afternoon
        const crossesMidnight = workEnd.getDate() !== workStart.getDate() ||
            workEnd.getTime() < workStart.getTime();

        if (!crossesMidnight && workEnd < triggerTime) {
            return 0;
        }

        // If shift ends on same day but doesn't reach trigger
        if (!crossesMidnight && workEnd.getTime() < triggerTime.getTime()) {
            return 0;
        }
    }

    // Calculate afternoon hours: from afternoonFrom to workEnd
    // But only count the part AFTER afternoonFrom
    const effectiveStart = workStart > afternoonFrom ? workStart : afternoonFrom;

    if (workEnd <= effectiveStart) return 0;

    const afternoonHours = diffHours(effectiveStart, workEnd);
    return round2(afternoonHours);
}

/**
 * Calculate OT hours: actual hours vs scheduled hours.
 *
 * OT = actual_hours - scheduled_hours
 * Can be NEGATIVE if actual < scheduled.
 *
 * @param workStart  - When work actually started
 * @param workEnd    - When work actually ended
 * @param schedStart - Scheduled start time
 * @param schedEnd   - Scheduled end time
 * @returns OT hours (float, rounded to 2dp, can be negative)
 */
export function calculateOTHours(
    workStart: Date,
    workEnd: Date,
    schedStart: Date,
    schedEnd: Date,
): number {
    if (workEnd <= workStart) return 0;

    const actualHours = diffHours(workStart, workEnd);
    const scheduledHours = diffHours(schedStart, schedEnd);
    if (scheduledHours <= 0) return 0;

    return round2(actualHours - scheduledHours);
}

/**
 * Calculate the full shift breakdown: normal, afternoon, and OT hours.
 *
 * Uses ACTUAL times if available, falls back to scheduled times.
 *
 * @param schedStart  - Scheduled start time
 * @param schedEnd    - Scheduled end time
 * @param actualStart - Actual clock-in time (null = use scheduled)
 * @param actualEnd   - Actual clock-out time (null = use scheduled)
 * @param config      - Calculation configuration
 * @returns ShiftBreakdown with normalHours, afternoonHours, otHours
 */
export function calculateShiftBreakdown(
    schedStart: Date,
    schedEnd: Date,
    actualStart: Date | null,
    actualEnd: Date | null,
    config: ShiftCalcConfig = DEFAULT_SHIFT_CONFIG
): ShiftBreakdown {
    // Use actual times if available, otherwise scheduled
    const workStart = actualStart || schedStart;
    const workEnd = actualEnd || schedEnd;

    // Guard against invalid dates (NaN)
    if (isNaN(workStart.getTime()) || isNaN(workEnd.getTime()) ||
        isNaN(schedStart.getTime()) || isNaN(schedEnd.getTime())) {
        return { normalHours: 0, afternoonHours: 0, otHours: 0 };
    }

    const afternoonHours = calculateAfternoonHours(workStart, workEnd, config);
    const otHours = calculateOTHours(workStart, workEnd, schedStart, schedEnd);

    // Total hours worked
    const totalHours = round2(diffHours(workStart, workEnd));

    // Normal = total - afternoon - positive OT (but at least 0)
    const positiveOt = Math.max(0, otHours);
    const normalHours = round2(Math.max(0, totalHours - afternoonHours - positiveOt));

    return {
        normalHours,
        afternoonHours,
        otHours,
    };
}

/**
 * Compute monthly accumulation from arrays of shift hours + previous carry-over.
 *
 * @param shifts - Array of {afternoonHours, otHours} for each shift in the period
 * @param prevAfternoonCarryOver - Hours carried from previous month
 * @param prevOtCarryOver - Hours carried from previous month
 * @param config - Calculation configuration
 * @returns MonthlyAccumulation
 */
export function calculateMonthlyAccumulation(
    shifts: { afternoonHours: number; otHours: number }[],
    prevAfternoonCarryOver: number = 0,
    prevOtCarryOver: number = 0,
    config: ShiftCalcConfig = DEFAULT_SHIFT_CONFIG
): MonthlyAccumulation {
    const totalAfternoonEarned = shifts.reduce((sum, s) => sum + s.afternoonHours, 0);
    const totalOtEarned = shifts.reduce((sum, s) => sum + s.otHours, 0);

    const totalAfternoonHours = prevAfternoonCarryOver + totalAfternoonEarned;
    const totalOtHours = prevOtCarryOver + totalOtEarned;

    const unit = config.hoursPerPaidShift;

    return {
        totalAfternoonHours: round2(totalAfternoonHours),
        totalOtHours: round2(totalOtHours),
        afternoonShifts: Math.floor(totalAfternoonHours / unit),
        otShifts: Math.floor(totalOtHours / unit),
        afternoonRemainder: round2(totalAfternoonHours % unit),
        otRemainder: round2(totalOtHours % unit),
    };
}

/**
 * Calculate carry-over after admin finalizes payments.
 *
 * @param totalHours - Total accumulated hours (carry-over + earned)
 * @param paidShifts - Number of full shifts paid out by admin
 * @param config - Calculation configuration
 * @returns Remaining hours to carry over
 */
export function calculateCarryOver(
    totalHours: number,
    paidShifts: number,
    config: ShiftCalcConfig = DEFAULT_SHIFT_CONFIG
): number {
    const paidHours = paidShifts * config.hoursPerPaidShift;
    return round2(totalHours - paidHours); // Can be negative (overpay)
}
