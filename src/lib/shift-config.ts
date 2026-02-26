// =====================================================
// Shift Calculation Configuration
// =====================================================
//
// This file centralizes all configurable parameters for
// the afternoon shift (เวรบ่าย) and OT calculation engine.
//
// When the ward changes its rules or when scaling to
// other wards, only this file needs to be modified.

export interface ShiftCalcConfig {
    /**
     * Afternoon counting starts from this hour (inclusive).
     * Default: 16 (16:00)
     */
    afternoonCountFromHour: number;

    /**
     * Afternoon hours only trigger if the shift end reaches
     * this hour. If the shift ends before this, afternoon = 0.
     * Default: 18 (18:00)
     */
    afternoonTriggerHour: number;

    /**
     * For shifts starting at this hour, afternoon counting
     * begins from this hour instead of `afternoonCountFromHour`,
     * and the trigger rule is bypassed (immediate).
     * Default: 15 (15:00)
     */
    earlyAfternoonStartHour: number;

    /**
     * Standard shift length in hours. OT = actual hours - this.
     * Default: 8
     */
    standardShiftHours: number;

    /**
     * Accumulation unit: how many hours make 1 full "เวร" for payout.
     * Default: 8
     */
    hoursPerPaidShift: number;
}

/**
 * Default configuration for the current ward.
 * Adjust these values to match ward-specific rules.
 */
export const DEFAULT_SHIFT_CONFIG: ShiftCalcConfig = {
    afternoonCountFromHour: 16,
    afternoonTriggerHour: 18,
    earlyAfternoonStartHour: 15,
    standardShiftHours: 8,
    hoursPerPaidShift: 8,
};
