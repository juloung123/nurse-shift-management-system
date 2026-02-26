'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getShiftsForPeriod, getAllProfiles, getMonthlySummary } from '@/lib/supabase/actions';
import { getCurrentPeriodKey, getDatesInPeriod, toDateString } from '@/lib/date-utils';
import PeriodSelector from '@/components/PeriodSelector';
import ShiftCard, { EmptyShiftCard } from '@/components/ShiftCard';
import ShiftEntryForm from '@/components/ShiftEntryForm';
import type { Profile, Shift } from '@/lib/types';
import { Loader2, ChevronLeft, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function AdminShiftManage() {
    const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey());
    const [nurses, setNurses] = useState<Profile[]>([]);
    const [selectedNurse, setSelectedNurse] = useState<Profile | null>(null);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [shiftsLoading, setShiftsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Shift form state
    const [formOpen, setFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

    // Load nurses list
    useEffect(() => {
        async function loadNurses() {
            setLoading(true);
            try {
                const profiles = await getAllProfiles();
                setNurses(profiles.filter((p) => p.role === 'nurse'));
            } catch (err) {
                console.error('Failed to load nurses:', err);
            } finally {
                setLoading(false);
            }
        }
        loadNurses();
    }, []);

    // Load shifts for selected nurse
    const loadShifts = useCallback(async () => {
        if (!selectedNurse) return;
        setShiftsLoading(true);
        try {
            const data = await getShiftsForPeriod(selectedNurse.id, periodKey);
            setShifts(data);
        } catch (err) {
            console.error('Failed to load shifts:', err);
        } finally {
            setShiftsLoading(false);
        }
    }, [selectedNurse, periodKey]);

    useEffect(() => {
        if (selectedNurse) loadShifts();
    }, [loadShifts, selectedNurse]);

    // Filter nurses by search
    const filteredNurses = useMemo(() => {
        if (!searchQuery) return nurses;
        const q = searchQuery.toLowerCase();
        return nurses.filter(
            (n) =>
                n.full_name.toLowerCase().includes(q) ||
                n.username.toLowerCase().includes(q)
        );
    }, [nurses, searchQuery]);

    // Map shifts by date
    const shiftsByDate = useMemo(() => {
        const map = new Map<string, Shift>();
        shifts.forEach((s) => map.set(s.date, s));
        return map;
    }, [shifts]);

    const periodDates = useMemo(() => getDatesInPeriod(periodKey), [periodKey]);

    const handleCardClick = useCallback((date: Date, shift?: Shift) => {
        setSelectedDate(date);
        setSelectedShift(shift || null);
        setFormOpen(true);
    }, []);

    const getInitials = (name: string) =>
        name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

    // ─── NURSE LIST VIEW ─────────
    if (!selectedNurse) {
        return (
            <div className="space-y-4 pb-8">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h1 className="text-lg font-bold">จัดการเวรพยาบาล</h1>
                </div>

                <Input
                    placeholder="ค้นหาพยาบาล..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10"
                />

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filteredNurses.map((nurse) => (
                            <Card
                                key={nurse.id}
                                className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]"
                                onClick={() => setSelectedNurse(nurse)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                                                {getInitials(nurse.full_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate">{nurse.full_name}</p>
                                            <p className="text-xs text-muted-foreground">@{nurse.username}</p>
                                        </div>
                                        <ChevronLeft className="h-5 w-5 text-muted-foreground/50 rotate-180" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredNurses.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                ไม่พบพยาบาล
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─── NURSE SHIFT VIEW (admin editing) ─────────
    return (
        <div className="space-y-4 pb-24">
            {/* Back button + nurse name */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => {
                        setSelectedNurse(null);
                        setShifts([]);
                    }}
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-lg font-bold truncate">{selectedNurse.full_name}</h1>
                    <p className="text-xs text-muted-foreground">@{selectedNurse.username} • จัดการเวร</p>
                </div>
            </div>

            {/* Period Selector */}
            <PeriodSelector
                selectedPeriod={periodKey}
                onPeriodChange={setPeriodKey}
            />

            {/* Shift List */}
            {shiftsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">
                        รายการเวร ({shifts.length} วัน)
                    </h2>
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

            {/* Shift Entry Form — editing for the selected nurse */}
            {selectedDate && (
                <ShiftEntryForm
                    date={selectedDate}
                    userId={selectedNurse.id}
                    existingShift={selectedShift}
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    onSaved={loadShifts}
                />
            )}
        </div>
    );
}
