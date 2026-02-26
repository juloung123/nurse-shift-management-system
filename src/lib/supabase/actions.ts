'use server';

import { createClient } from './server';
import type { Profile, Shift, MonthlySummary } from '../types';
import { getPeriodRange, toDateString } from '../date-utils';
import { calculateShiftBreakdown } from '../shift-calculations';

// =====================================================
// Profile Actions
// =====================================================

export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return data;
}

export async function getAllProfiles(): Promise<Profile[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

    return data || [];
}

// =====================================================
// Shift Actions
// =====================================================

export async function getShiftsForPeriod(
    userId: string,
    periodKey: string
): Promise<Shift[]> {
    const supabase = await createClient();
    const { start, end } = getPeriodRange(periodKey);

    const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', userId)
        .gte('date', toDateString(start))
        .lte('date', toDateString(end))
        .order('date', { ascending: true });

    return data || [];
}

export async function upsertShift(shift: {
    user_id: string;
    date: string;
    sched_start: string;
    sched_end: string;
    actual_start: string | null;
    actual_end: string | null;
    notes: string | null;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Calculate afternoon and OT hours
    const schedStart = new Date(shift.sched_start);
    const schedEnd = new Date(shift.sched_end);
    const actualEnd = shift.actual_end ? new Date(shift.actual_end) : null;

    const breakdown = calculateShiftBreakdown(
        schedStart,
        schedEnd,
        shift.actual_start ? new Date(shift.actual_start) : null,
        actualEnd
    );

    const { error } = await supabase
        .from('shifts')
        .upsert(
            {
                ...shift,
                calculated_afternoon_hours: breakdown.afternoonHours,
                calculated_ot_hours: breakdown.otHours,
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id,date',
            }
        );

    if (error) {
        return { success: false, error: error.message };
    }

    return { success: true };
}

export async function deleteShift(
    shiftId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('shifts')
        .delete()
        .eq('id', shiftId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// =====================================================
// Monthly Summary Actions
// =====================================================

export async function getMonthlySummary(
    userId: string,
    periodKey: string
): Promise<MonthlySummary | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('monthly_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('month_period', periodKey)
        .single();

    return data;
}

export async function getAllMonthlySummaries(
    periodKey: string
): Promise<(MonthlySummary & { profiles: Profile })[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('monthly_summaries')
        .select('*, profiles(*)')
        .eq('month_period', periodKey);

    return (data || []) as (MonthlySummary & { profiles: Profile })[];
}

export async function finalizeMonthlySummary(input: {
    user_id: string;
    month_period: string;
    prev_month_afternoon_carry_over: number;
    prev_month_ot_carry_over: number;
    total_afternoon_hours: number;
    total_ot_hours: number;
    paid_afternoon_shifts: number;
    paid_ot_shifts: number;
    remaining_afternoon_carry_over: number;
    remaining_ot_carry_over: number;
}): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('monthly_summaries')
        .upsert(
            {
                ...input,
                status: 'finalized',
                updated_at: new Date().toISOString(),
            },
            {
                onConflict: 'user_id,month_period',
            }
        );

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// =====================================================
// Auth Actions
// =====================================================

export async function signOut() {
    const supabase = await createClient();
    await supabase.auth.signOut();
}

// =====================================================
// User Management Actions (Admin only)
// =====================================================

export async function updateUserRole(
    userId: string,
    newRole: 'nurse' | 'manager' | 'admin' | 'pending'
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteUser(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    // Delete profile (cascade will handle auth.users due to FK)
    const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
