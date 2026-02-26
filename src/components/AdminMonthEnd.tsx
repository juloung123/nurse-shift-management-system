'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Sun, Moon, Save, Loader2, AlertCircle, ArrowRight, Calculator, CheckCircle2, AlertTriangle } from 'lucide-react';
import { calculateCarryOver } from '@/lib/shift-calculations';
import { finalizeMonthlySummary } from '@/lib/supabase/actions';
import type { Profile } from '@/lib/types';

interface AdminMonthEndProps {
    open: boolean;
    onClose: () => void;
    onFinalized: () => void;
    nurse: Profile;
    periodKey: string;
    prevAfternoonCarryOver: number;
    prevOtCarryOver: number;
    currentAfternoonHours: number;
    currentOtHours: number;
}

export default function AdminMonthEnd({
    open,
    onClose,
    onFinalized,
    nurse,
    periodKey,
    prevAfternoonCarryOver,
    prevOtCarryOver,
    currentAfternoonHours,
    currentOtHours,
}: AdminMonthEndProps) {
    const totalAfternoon = prevAfternoonCarryOver + currentAfternoonHours;
    const totalOt = prevOtCarryOver + currentOtHours;

    const maxAfternoonShifts = Math.floor(totalAfternoon / 8);
    const maxOtShifts = Math.floor(totalOt / 8);

    const [paidAfternoonShifts, setPaidAfternoonShifts] = useState(maxAfternoonShifts);
    const [paidOtShifts, setPaidOtShifts] = useState(maxOtShifts);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Computed carry-overs
    const remainingAfternoon = useMemo(
        () => calculateCarryOver(totalAfternoon, paidAfternoonShifts),
        [totalAfternoon, paidAfternoonShifts]
    );

    const remainingOt = useMemo(
        () => calculateCarryOver(totalOt, paidOtShifts),
        [totalOt, paidOtShifts]
    );

    const handleFinalize = useCallback(async () => {
        setError('');
        setLoading(true);

        try {
            const result = await finalizeMonthlySummary({
                user_id: nurse.id,
                month_period: periodKey,
                prev_month_afternoon_carry_over: prevAfternoonCarryOver,
                prev_month_ot_carry_over: prevOtCarryOver,
                total_afternoon_hours: currentAfternoonHours,
                total_ot_hours: currentOtHours,
                paid_afternoon_shifts: paidAfternoonShifts,
                paid_ot_shifts: paidOtShifts,
                remaining_afternoon_carry_over: remainingAfternoon,
                remaining_ot_carry_over: remainingOt,
            });

            if (!result.success) {
                setError(result.error || 'ไม่สามารถบันทึกได้');
                return;
            }

            onFinalized();
            onClose();
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setLoading(false);
        }
    }, [
        nurse.id, periodKey, prevAfternoonCarryOver, prevOtCarryOver,
        currentAfternoonHours, currentOtHours, paidAfternoonShifts,
        paidOtShifts, remainingAfternoon, remainingOt, onFinalized, onClose,
    ]);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Calculator className="h-5 w-5" />
                        สรุปเดือน
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        {nurse.full_name} • {periodKey}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* ===== AFTERNOON SECTION ===== */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Sun className="h-4 w-4 text-amber-500" />
                            เวรบ่าย (Afternoon Shift)
                        </Label>

                        {/* Breakdown */}
                        <Card className="gradient-card-afternoon border-0">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">ยกมาเดือนก่อน</span>
                                    <span className="font-medium tabular-nums">{prevAfternoonCarryOver} ชม.</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">สะสมเดือนนี้</span>
                                    <span className="font-medium tabular-nums">+ {currentAfternoonHours} ชม.</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-sm font-bold">
                                    <span>รวมทั้งหมด</span>
                                    <span className="tabular-nums text-amber-700">{totalAfternoon} ชม.</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    = {maxAfternoonShifts} เวร (8 ชม.) + {Math.round((totalAfternoon % 8) * 100) / 100} ชม. เศษ
                                </div>
                            </CardContent>
                        </Card>

                        {/* Pay out input */}
                        <div className="flex items-center gap-3">
                            <Label className="text-sm whitespace-nowrap">จ่าย</Label>
                            <Input
                                type="number"
                                min={0}
                                value={paidAfternoonShifts}
                                onChange={(e) => setPaidAfternoonShifts(Math.max(0, parseInt(e.target.value) || 0))}
                                className="h-10 w-20 text-center tabular-nums"
                            />
                            <Label className="text-sm whitespace-nowrap flex items-center gap-1">
                                เวร
                                <Badge variant="outline" className="ml-1 tabular-nums">สะสม {maxAfternoonShifts}</Badge>
                            </Label>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-amber-500" />
                            <span>ยกไปเดือนหน้า:</span>
                            <span className={`font-bold tabular-nums ${remainingAfternoon < 0 ? 'text-red-600' : 'text-amber-700'}`}>{remainingAfternoon} ชม.</span>
                        </div>
                        {remainingAfternoon < 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-md px-2.5 py-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>จ่ายเกินจากที่สะสม — ยอดยกไปเดือนหน้าจะติดลบ</span>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* ===== OT SECTION ===== */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Moon className="h-4 w-4 text-teal-500" />
                            OT (Overtime)
                        </Label>

                        <Card className="gradient-card-ot border-0">
                            <CardContent className="p-3 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">ยกมาเดือนก่อน</span>
                                    <span className="font-medium tabular-nums">{prevOtCarryOver} ชม.</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">สะสมเดือนนี้</span>
                                    <span className="font-medium tabular-nums">+ {currentOtHours} ชม.</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-sm font-bold">
                                    <span>รวมทั้งหมด</span>
                                    <span className="tabular-nums text-teal-700">{totalOt} ชม.</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    = {maxOtShifts} เวร (8 ชม.) + {Math.round((totalOt % 8) * 100) / 100} ชม. เศษ
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex items-center gap-3">
                            <Label className="text-sm whitespace-nowrap">จ่าย</Label>
                            <Input
                                type="number"
                                min={0}
                                value={paidOtShifts}
                                onChange={(e) => setPaidOtShifts(Math.max(0, parseInt(e.target.value) || 0))}
                                className="h-10 w-20 text-center tabular-nums"
                            />
                            <Label className="text-sm whitespace-nowrap flex items-center gap-1">
                                เวร
                                <Badge variant="outline" className="ml-1 tabular-nums">สะสม {maxOtShifts}</Badge>
                            </Label>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-4 w-4 text-teal-500" />
                            <span>ยกไปเดือนหน้า:</span>
                            <span className={`font-bold tabular-nums ${remainingOt < 0 ? 'text-red-600' : 'text-teal-700'}`}>{remainingOt} ชม.</span>
                        </div>
                        {remainingOt < 0 && (
                            <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 rounded-md px-2.5 py-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>จ่ายเกินจากที่สะสม — ยอดยกไปเดือนหน้าจะติดลบ</span>
                            </div>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3 animate-fade-in">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <Button
                        className="w-full h-11 gradient-header hover:opacity-90"
                        onClick={handleFinalize}
                        disabled={loading}
                    >
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                        )}
                        {loading ? 'กำลังบันทึก...' : 'ยืนยันและปิดงวด'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
