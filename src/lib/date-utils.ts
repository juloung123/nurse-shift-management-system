// =====================================================
// Date Utilities for 16th→15th Monthly Period
// =====================================================
//
// The hospital pay cycle runs from the 16th of month N
// to the 15th of month N+1. This module handles all
// period-related date logic.

import type { PeriodRange } from './types';

const THAI_MONTHS = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

const EN_MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Get the period range for a given "month_period" key.
 * 
 * Period key "2026-02" means:
 *   Start: 16 Jan 2026, 00:00:00
 *   End:   15 Feb 2026, 23:59:59
 *
 * @param periodKey - Format "YYYY-MM" where MM is the ending month
 * @returns PeriodRange
 */
export function getPeriodRange(periodKey: string): PeriodRange {
    const [year, month] = periodKey.split('-').map(Number);

    // Start: 16th of previous month
    let startMonth = month - 1;
    let startYear = year;
    if (startMonth < 1) {
        startMonth = 12;
        startYear = year - 1;
    }
    const start = new Date(startYear, startMonth - 1, 16, 0, 0, 0, 0);

    // End: 15th of the period month (end of day)
    const end = new Date(year, month - 1, 15, 23, 59, 59, 999);

    const label = `${16} ${THAI_MONTHS[startMonth - 1]} - ${15} ${THAI_MONTHS[month - 1]} ${year + 543}`;

    return { start, end, label, periodKey };
}

/**
 * Get a bilingual period label.
 */
export function getPeriodLabelEN(periodKey: string): string {
    const [year, month] = periodKey.split('-').map(Number);
    let startMonth = month - 1;
    let startYear = year;
    if (startMonth < 1) {
        startMonth = 12;
        startYear = year - 1;
    }
    return `${16} ${EN_MONTHS[startMonth - 1]} ${startYear} – ${15} ${EN_MONTHS[month - 1]} ${year}`;
}

/**
 * Determine which period a given date falls into.
 * 
 * If date.day >= 16, it belongs to next month's period.
 * If date.day <= 15, it belongs to current month's period.
 *
 * @param date - The date to check
 * @returns Period key in "YYYY-MM" format
 */
export function dateToPeriodKey(date: Date): string {
    const day = date.getDate();
    let month = date.getMonth() + 1; // 1-indexed
    let year = date.getFullYear();

    if (day >= 16) {
        // Belongs to NEXT month's period
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return `${year}-${String(month).padStart(2, '0')}`;
}

/**
 * Get the current active period key based on today's date.
 */
export function getCurrentPeriodKey(): string {
    return dateToPeriodKey(new Date());
}

/**
 * Generate a list of period keys for selection dropdown.
 * Returns 12 months centered around (and including) the current period.
 */
export function getAvailablePeriods(count: number = 12): PeriodRange[] {
    const currentKey = getCurrentPeriodKey();
    const [currentYear, currentMonth] = currentKey.split('-').map(Number);

    const periods: PeriodRange[] = [];
    // Go back 6 months, forward 5 months from current
    for (let i = -6; i < count - 6; i++) {
        let m = currentMonth + i;
        let y = currentYear;
        while (m < 1) { m += 12; y -= 1; }
        while (m > 12) { m -= 12; y += 1; }
        const key = `${y}-${String(m).padStart(2, '0')}`;
        periods.push(getPeriodRange(key));
    }

    return periods;
}

/**
 * Format a date for display (Thai locale).
 */
export function formatDateThai(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate();
    const month = THAI_MONTHS[d.getMonth()];
    return `${day} ${month}`;
}

/**
 * Format only the Thai month abbreviation (e.g. "ก.พ.").
 * Use when the day number is already displayed separately.
 */
export function formatMonthThai(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return THAI_MONTHS[d.getMonth()];
}

/**
 * Format time from Date or ISO string.
 */
export function formatTime(dateOrIso: Date | string): string {
    const d = typeof dateOrIso === 'string' ? new Date(dateOrIso) : dateOrIso;
    return d.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
}

/**
 * Get all dates in a period range.
 */
export function getDatesInPeriod(periodKey: string): Date[] {
    const { start, end } = getPeriodRange(periodKey);
    const dates: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Format date as YYYY-MM-DD.
 */
export function toDateString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Create a Date object for a specific time on a given date.
 */
export function createDateTime(dateStr: string, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(dateStr + 'T00:00:00');
    d.setHours(hours, minutes, 0, 0);
    return d;
}

/**
 * Create a Date for the next day at a specific time (for overnight shifts).
 */
export function createNextDayTime(dateStr: string, time: string): Date {
    const d = createDateTime(dateStr, time);
    d.setDate(d.getDate() + 1);
    return d;
}
