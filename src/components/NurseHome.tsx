'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getShiftsForPeriod, getMonthlySummary } from '@/lib/supabase/actions';
import { getCurrentPeriodKey, getDatesInPeriod, toDateString } from '@/lib/date-utils';
import { calculateMonthlyAccumulation } from '@/lib/shift-calculations';
import PeriodSelector from '@/components/PeriodSelector';
import StatsHeader from '@/components/StatsHeader';
import ShiftCard, { EmptyShiftCard } from '@/components/ShiftCard';
import ShiftEntryForm from '@/components/ShiftEntryForm';
import type { Profile, Shift, MonthlyAccumulation } from '@/lib/types';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NurseHomeProps {
    profile: Profile;
}

export default function NurseHome({ profile }: NurseHomeProps) {
    const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey());
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [prevAfternoonCarry, setPrevAfternoonCarry] = useState(0);
    const [prevOtCarry, setPrevOtCarry] = useState(0);

    // Shift form state
    const [formOpen, setFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [shiftsData, prevSummary] = await Promise.all([
                getShiftsForPeriod(profile.id, periodKey),
                getPreviousSummary(profile.id, periodKey),
            ]);
            setShifts(shiftsData);
            setPrevAfternoonCarry(prevSummary?.remaining_afternoon_carry_over ?? 0);
            setPrevOtCarry(prevSummary?.remaining_ot_carry_over ?? 0);
        } catch (err) {
            console.error('Failed to load shifts:', err);
        } finally {
            setLoading(false);
        }
    }, [profile.id, periodKey]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Calculate accumulation
    const accumulation: MonthlyAccumulation = useMemo(() => {
        return calculateMonthlyAccumulation(
            shifts.map((s) => ({
                afternoonHours: s.calculated_afternoon_hours,
                otHours: s.calculated_ot_hours,
            })),
            prevAfternoonCarry,
            prevOtCarry
        );
    }, [shifts, prevAfternoonCarry, prevOtCarry]);

    // Map shifts by date for easy lookup
    const shiftsByDate = useMemo(() => {
        const map = new Map<string, Shift>();
        shifts.forEach((s) => map.set(s.date, s));
        return map;
    }, [shifts]);

    // All dates in the period
    const periodDates = useMemo(() => getDatesInPeriod(periodKey), [periodKey]);

    const handleCardClick = useCallback((date: Date, shift?: Shift) => {
        setSelectedDate(date);
        setSelectedShift(shift || null);
        setFormOpen(true);
    }, []);

    return (
        <div className="space-y-4 pb-24">
            {/* Period Selector */}
            <PeriodSelector
                selectedPeriod={periodKey}
                onPeriodChange={setPeriodKey}
            />

            {/* Stats */}
            <StatsHeader
                prevAfternoonCarryOver={prevAfternoonCarry}
                prevOtCarryOver={prevOtCarry}
                accumulation={accumulation}
            />

            {/* Shift List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-muted-foreground">
                            รายการเวร ({shifts.length} วัน)
                        </h2>
                    </div>
                    {periodDates.map((date) => {
                        const dateStr = toDateString(date);
                        const shift = shiftsByDate.get(dateStr);
                        return shift ? (
                            <div key={dateStr} className="animate-fade-in">
                                <ShiftCard
                                    shift={shift}
                                    onClick={() => handleCardClick(date, shift)}
                                />
                            </div>
                        ) : (
                            <EmptyShiftCard
                                key={dateStr}
                                date={date}
                                onClick={() => handleCardClick(date)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Floating Add Button */}
            <Button
                className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg gradient-header hover:opacity-90 z-40"
                onClick={() => {
                    setSelectedDate(new Date());
                    setSelectedShift(null);
                    setFormOpen(true);
                }}
            >
                <Plus className="h-6 w-6" />
            </Button>

            {/* Shift Entry Form */}
            {selectedDate && (
                <ShiftEntryForm
                    date={selectedDate}
                    userId={profile.id}
                    existingShift={selectedShift}
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    onSaved={loadData}
                />
            )}
        </div>
    );
}

// Helper to get the previous period's summary
async function getPreviousSummary(userId: string, currentPeriodKey: string) {
    const [year, month] = currentPeriodKey.split('-').map(Number);
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = year - 1;
    }
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    return getMonthlySummary(userId, prevKey);
}
