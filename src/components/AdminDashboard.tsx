'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PeriodSelector from '@/components/PeriodSelector';
import AdminMonthEnd from '@/components/AdminMonthEnd';
import { getCurrentPeriodKey } from '@/lib/date-utils';
import { getAllProfiles, getShiftsForPeriod, getMonthlySummary } from '@/lib/supabase/actions';
import { calculateMonthlyAccumulation } from '@/lib/shift-calculations';
import type { Profile, MonthlyAccumulation } from '@/lib/types';
import {
    Sun, Moon, Users, CheckCircle2, Search, Loader2,
    Calculator, ChevronRight
} from 'lucide-react';

interface NurseRow {
    profile: Profile;
    accumulation: MonthlyAccumulation;
    prevAfternoonCarryOver: number;
    prevOtCarryOver: number;
    currentAfternoonHours: number;
    currentOtHours: number;
    isFinalized: boolean;
}

export default function AdminDashboard() {
    const [periodKey, setPeriodKey] = useState(getCurrentPeriodKey());
    const [nurses, setNurses] = useState<NurseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNurse, setSelectedNurse] = useState<NurseRow | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const profiles = await getAllProfiles();
            const nurseProfiles = profiles.filter((p) => p.role === 'nurse');

            // Calculate previous period key
            const [y, m] = periodKey.split('-').map(Number);
            let pm = m - 1, py = y;
            if (pm < 1) { pm = 12; py--; }
            const prevKey = `${py}-${String(pm).padStart(2, '0')}`;

            const rows: NurseRow[] = await Promise.all(
                nurseProfiles.map(async (profile) => {
                    const [shifts, prevSummary, currentSummary] = await Promise.all([
                        getShiftsForPeriod(profile.id, periodKey),
                        getMonthlySummary(profile.id, prevKey),
                        getMonthlySummary(profile.id, periodKey),
                    ]);

                    const prevAfternoon = prevSummary?.remaining_afternoon_carry_over ?? 0;
                    const prevOt = prevSummary?.remaining_ot_carry_over ?? 0;

                    const currentAfternoon = shifts.reduce((s, sh) => s + sh.calculated_afternoon_hours, 0);
                    const currentOt = shifts.reduce((s, sh) => s + sh.calculated_ot_hours, 0);

                    const accumulation = calculateMonthlyAccumulation(
                        shifts.map((s) => ({
                            afternoonHours: s.calculated_afternoon_hours,
                            otHours: s.calculated_ot_hours,
                        })),
                        prevAfternoon,
                        prevOt
                    );

                    return {
                        profile,
                        accumulation,
                        prevAfternoonCarryOver: prevAfternoon,
                        prevOtCarryOver: prevOt,
                        currentAfternoonHours: currentAfternoon,
                        currentOtHours: currentOt,
                        isFinalized: currentSummary?.status === 'finalized',
                    };
                })
            );

            setNurses(rows);
        } catch (err) {
            console.error('Failed to load admin data:', err);
        } finally {
            setLoading(false);
        }
    }, [periodKey]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredNurses = useMemo(() => {
        if (!searchQuery) return nurses;
        const q = searchQuery.toLowerCase();
        return nurses.filter(
            (n) =>
                n.profile.full_name.toLowerCase().includes(q) ||
                n.profile.username.toLowerCase().includes(q)
        );
    }, [nurses, searchQuery]);

    // Totals
    const totals = useMemo(() => ({
        afternoon: nurses.reduce((s, n) => s + n.accumulation.totalAfternoonHours, 0),
        ot: nurses.reduce((s, n) => s + n.accumulation.totalOtHours, 0),
        finalized: nurses.filter((n) => n.isFinalized).length,
    }), [nurses]);

    return (
        <div className="space-y-4 pb-8">
            {/* Period Selector */}
            <PeriodSelector selectedPeriod={periodKey} onPeriodChange={setPeriodKey} />

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
                <Card className="border-0 shadow-sm bg-primary/5">
                    <CardContent className="p-3 text-center">
                        <Users className="h-4 w-4 mx-auto text-primary mb-1" />
                        <p className="text-xl font-bold tabular-nums">{nurses.length}</p>
                        <p className="text-xs text-muted-foreground">พยาบาล</p>
                    </CardContent>
                </Card>
                <Card className="gradient-card-afternoon border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                        <Sun className="h-4 w-4 mx-auto text-amber-600 mb-1" />
                        <p className="text-xl font-bold tabular-nums text-amber-900">{Math.round(totals.afternoon)}</p>
                        <p className="text-xs text-amber-700">ชม. บ่าย</p>
                    </CardContent>
                </Card>
                <Card className="gradient-card-ot border-0 shadow-sm">
                    <CardContent className="p-3 text-center">
                        <Moon className="h-4 w-4 mx-auto text-teal-600 mb-1" />
                        <p className="text-xl font-bold tabular-nums text-teal-900">{Math.round(totals.ot)}</p>
                        <p className="text-xs text-teal-700">ชม. OT</p>
                    </CardContent>
                </Card>
            </div>

            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ปิดงวดแล้ว</span>
                <Badge variant={totals.finalized === nurses.length ? 'default' : 'secondary'}>
                    {totals.finalized} / {nurses.length}
                </Badge>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ค้นหาพยาบาล..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                />
            </div>

            {/* Nurse List */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredNurses.map((row) => (
                        <Card
                            key={row.profile.id}
                            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] ${row.isFinalized ? 'border-l-4 border-l-emerald-500 bg-emerald-50/30' : ''
                                }`}
                            onClick={() => {
                                setSelectedNurse(row);
                                setModalOpen(true);
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold truncate">
                                                {row.profile.full_name}
                                            </span>
                                            {row.isFinalized && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                            )}
                                        </div>
                                        <div className="flex gap-3 mt-1.5">
                                            <Badge variant="secondary" className="gradient-card-afternoon text-xs">
                                                <Sun className="h-3 w-3 mr-1" />
                                                {row.accumulation.totalAfternoonHours} ชม.
                                                ({row.accumulation.afternoonShifts} เวร)
                                            </Badge>
                                            <Badge variant="secondary" className="gradient-card-ot text-xs">
                                                <Moon className="h-3 w-3 mr-1" />
                                                {row.accumulation.totalOtHours} ชม.
                                                ({row.accumulation.otShifts} เวร)
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <Calculator className="h-4 w-4 text-muted-foreground/50" />
                                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredNurses.length === 0 && !loading && (
                        <div className="text-center py-8 text-muted-foreground">
                            ไม่พบข้อมูลพยาบาล
                        </div>
                    )}
                </div>
            )}

            {/* Admin Month End Modal */}
            {selectedNurse && (
                <AdminMonthEnd
                    open={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onFinalized={loadData}
                    nurse={selectedNurse.profile}
                    periodKey={periodKey}
                    prevAfternoonCarryOver={selectedNurse.prevAfternoonCarryOver}
                    prevOtCarryOver={selectedNurse.prevOtCarryOver}
                    currentAfternoonHours={selectedNurse.currentAfternoonHours}
                    currentOtHours={selectedNurse.currentOtHours}
                />
            )}
        </div>
    );
}
