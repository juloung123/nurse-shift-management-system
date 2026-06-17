'use server';

import { createClient } from './server';
import { createAdminClient } from './admin';
import type { Profile, Shift, MonthlySummary, WardSettings, PasswordResetRequestWithProfile } from '../types';
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

// =====================================================
// Ward Settings Actions
// =====================================================

export async function getWardSettings(
    periodKey: string
): Promise<WardSettings | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('ward_settings')
        .select('*')
        .eq('period_key', periodKey)
        .single();

    return data;
}

export async function setWardSettings(
    periodKey: string,
    workingDays: number
): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
        .from('ward_settings')
        .upsert(
            {
                period_key: periodKey,
                working_days: workingDays,
                updated_by: user.id,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'period_key' }
        );

    if (error) return { success: false, error: error.message };
    return { success: true };
}

// =====================================================
// Password Reset Actions
//
// Forgot-password flow: a logged-out nurse requests a reset (public action);
// an admin resolves it from the queue by setting a new password.
//
// ⚠️ The admin client (createAdminClient) bypasses RLS, so every admin action
// below MUST re-verify role === 'admin' via the normal session client before
// using it. Authorization is enforced in code, not by RLS.
// =====================================================

/** Returns the caller's profile only if they are an admin; otherwise null. */
async function getAdminProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'admin') return null;
    return profile as Profile;
}

/**
 * Public (logged-out) request to reset a password.
 *
 * Always returns generic success — never reveals whether the username exists,
 * is still pending approval, or already has a pending request. This prevents
 * account enumeration.
 */
export async function requestPasswordReset(
    username: string
): Promise<{ success: boolean }> {
    const cleaned = (username ?? '').toLowerCase().trim();
    if (!cleaned) return { success: true };

    try {
        const admin = createAdminClient();

        // Case-insensitive lookup. Escape LIKE wildcards so an unusual username
        // cannot broaden the match.
        const escaped = cleaned
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_');
        const { data: profile } = await admin
            .from('profiles')
            .select('id')
            .ilike('username', escaped)
            .maybeSingle();

        // No matching account — silently no-op (still success).
        if (!profile) return { success: true };

        // Create a pending request. If one already exists for this user the
        // unique partial index (one pending per user) rejects the insert with
        // 23505 — that is expected, swallow it silently.
        const { error: insertError } = await admin
            .from('password_reset_requests')
            .insert({ user_id: profile.id });

        if (insertError && insertError.code !== '23505') {
            console.error('password_reset_requests insert failed:', insertError.message);
        }

        return { success: true };
    } catch (err) {
        // Never surface internal errors on this public endpoint.
        console.error('requestPasswordReset failed:', err);
        return { success: true };
    }
}

/** Admin: list pending reset requests with the owning profile. */
export async function getPendingPasswordResets(): Promise<PasswordResetRequestWithProfile[]> {
    const adminProfile = await getAdminProfile();
    if (!adminProfile) return [];

    const admin = createAdminClient();
    // `profiles!user_id` disambiguates which FK to join on — this table has two
    // FKs to profiles (user_id and resolved_by), so PostgREST needs the hint.
    const { data } = await admin
        .from('password_reset_requests')
        .select('*, profiles:profiles!user_id(full_name, username, role)')
        .eq('status', 'pending')
        .order('requested_at', { ascending: false });

    return (data || []) as PasswordResetRequestWithProfile[];
}

/** Admin: set a new password for the user behind a reset request and resolve it. */
export async function resolvePasswordReset(
    requestId: string,
    newPassword: string
): Promise<{ success: boolean; error?: string }> {
    const adminProfile = await getAdminProfile();
    if (!adminProfile) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };

    if (!newPassword || newPassword.length < 6) {
        return { success: false, error: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' };
    }

    const admin = createAdminClient();

    const { data: request, error: loadError } = await admin
        .from('password_reset_requests')
        .select('id, user_id, status')
        .eq('id', requestId)
        .maybeSingle();

    if (loadError || !request) {
        return { success: false, error: 'ไม่พบคำขอ' };
    }
    // Idempotency guard against double-submit.
    if (request.status !== 'pending') {
        return { success: false, error: 'คำขอนี้ดำเนินการไปแล้ว' };
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
        request.user_id,
        { password: newPassword }
    );

    if (updateError) {
        return { success: false, error: updateError.message };
    }

    const { error: markError } = await admin
        .from('password_reset_requests')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: adminProfile.id,
        })
        .eq('id', requestId);

    if (markError) {
        // Password was changed successfully but the status row couldn't be updated.
        return { success: true, error: 'ตั้งรหัสสำเร็จ แต่บันทึกสถานะคำขอไม่สำเร็จ' };
    }

    return { success: true };
}

/** Admin: reject a pending reset request without changing any password. */
export async function rejectPasswordReset(
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    const adminProfile = await getAdminProfile();
    if (!adminProfile) return { success: false, error: 'ไม่มีสิทธิ์เข้าถึง' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('password_reset_requests')
        .update({
            status: 'rejected',
            resolved_at: new Date().toISOString(),
            resolved_by: adminProfile.id,
        })
        .eq('id', requestId)
        .eq('status', 'pending');

    if (error) return { success: false, error: error.message };
    return { success: true };
}
