'use client';

import { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import TimeInput24 from '@/components/TimeInput24';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Sun, Moon, Clock, Save, Trash2, Loader2, AlertCircle, Copy, AlertTriangle } from 'lucide-react';
import { calculateShiftBreakdown } from '@/lib/shift-calculations';
import { createDateTime, createNextDayTime, toDateString } from '@/lib/date-utils';
import { upsertShift, deleteShift } from '@/lib/supabase/actions';
import type { Shift, ShiftBreakdown } from '@/lib/types';

const DAY_NAMES_TH = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

interface ShiftEntryFormProps {
    date: Date;
    userId: string;
    existingShift?: Shift | null;
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export default function ShiftEntryForm({
    date,
    userId,
    existingShift,
    open,
    onClose,
    onSaved,
}: ShiftEntryFormProps) {
    const dateStr = toDateString(date);

    // Parse existing shift or use defaults
    const getInitialTime = (isoStr: string | null | undefined, defaultTime: string): string => {
        if (!isoStr) return defaultTime;
        const d = new Date(isoStr);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const [schedStartTime, setSchedStartTime] = useState(
        getInitialTime(existingShift?.sched_start, '08:00')
    );
    const [schedEndTime, setSchedEndTime] = useState(
        getInitialTime(existingShift?.sched_end, '16:00')
    );
    const [actualStartTime, setActualStartTime] = useState(
        getInitialTime(existingShift?.actual_start, '')
    );
    const [actualEndTime, setActualEndTime] = useState(
        getInitialTime(existingShift?.actual_end, '')
    );
    const [schedEndNextDay, setSchedEndNextDay] = useState(false);
    const [actualEndNextDay, setActualEndNextDay] = useState(false);
    const [notes, setNotes] = useState(existingShift?.notes || '');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    // Helper: check if time string is valid HH:MM
    const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

    // Real-time breakdown calculation
    const breakdown: ShiftBreakdown = useMemo(() => {
        try {
            if (!isValidTime(schedStartTime) || !isValidTime(schedEndTime)) {
                return { normalHours: 0, afternoonHours: 0, otHours: 0 };
            }

            const schedStart = createDateTime(dateStr, schedStartTime);
            const schedEnd = schedEndNextDay
                ? createNextDayTime(dateStr, schedEndTime)
                : createDateTime(dateStr, schedEndTime);

            const actualEnd = (actualEndTime && isValidTime(actualEndTime))
                ? actualEndNextDay
                    ? createNextDayTime(dateStr, actualEndTime)
                    : createDateTime(dateStr, actualEndTime)
                : null;

            const actualStart = (actualStartTime && isValidTime(actualStartTime))
                ? createDateTime(dateStr, actualStartTime)
                : null;

            return calculateShiftBreakdown(schedStart, schedEnd, actualStart, actualEnd);
        } catch {
            return { normalHours: 0, afternoonHours: 0, otHours: 0 };
        }
    }, [dateStr, schedStartTime, schedEndTime, actualStartTime, actualEndTime, schedEndNextDay, actualEndNextDay]);

    // Scheduled duration for <8h warning
    const schedDuration = useMemo(() => {
        if (!isValidTime(schedStartTime) || !isValidTime(schedEndTime)) return 0;
        try {
            const s = createDateTime(dateStr, schedStartTime);
            const e = schedEndNextDay
                ? createNextDayTime(dateStr, schedEndTime)
                : createDateTime(dateStr, schedEndTime);
            return Math.max(0, (e.getTime() - s.getTime()) / (1000 * 60 * 60));
        } catch { return 0; }
    }, [dateStr, schedStartTime, schedEndTime, schedEndNextDay]);

    const handleSave = useCallback(async () => {
        setError('');
        setLoading(true);

        try {
            const schedStart = createDateTime(dateStr, schedStartTime);
            const schedEnd = schedEndNextDay
                ? createNextDayTime(dateStr, schedEndTime)
                : createDateTime(dateStr, schedEndTime);

            const actualStart = actualStartTime
                ? createDateTime(dateStr, actualStartTime)
                : null;
            const actualEnd = actualEndTime
                ? actualEndNextDay
                    ? createNextDayTime(dateStr, actualEndTime)
                    : createDateTime(dateStr, actualEndTime)
                : null;

            const result = await upsertShift({
                user_id: userId,
                date: dateStr,
                sched_start: schedStart.toISOString(),
                sched_end: schedEnd.toISOString(),
                actual_start: actualStart?.toISOString() || null,
                actual_end: actualEnd?.toISOString() || null,
                notes: notes || null,
            });

            if (!result.success) {
                setError(result.error || 'เกิดข้อผิดพลาด');
                return;
            }

            onSaved();
            onClose();
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setLoading(false);
        }
    }, [dateStr, schedStartTime, schedEndTime, actualStartTime, actualEndTime, schedEndNextDay, actualEndNextDay, notes, userId, onSaved, onClose]);

    const handleDelete = useCallback(async () => {
        if (!existingShift?.id) return;
        setDeleting(true);
        try {
            const result = await deleteShift(existingShift.id);
            if (result.success) {
                onSaved();
                onClose();
            } else {
                setError(result.error || 'ลบไม่สำเร็จ');
            }
        } finally {
            setDeleting(false);
        }
    }, [existingShift, onSaved, onClose]);

    const dayName = DAY_NAMES_TH[date.getDay()];

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {existingShift ? 'แก้ไขเวร' : 'เพิ่มเวร'}
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        วัน{dayName}ที่ {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Scheduled Time */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            เวลากำหนด (Schedule)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">เริ่ม</Label>
                                <TimeInput24
                                    value={schedStartTime}
                                    onChange={setSchedStartTime}
                                    className="h-11 text-base tabular-nums"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">สิ้นสุด</Label>
                                    <button
                                        type="button"
                                        className={`text-[10px] leading-none px-2 py-1 rounded-full font-medium transition-colors ${schedEndNextDay
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        onClick={() => setSchedEndNextDay(!schedEndNextDay)}
                                    >
                                        +1 วัน
                                    </button>
                                </div>
                                <TimeInput24
                                    value={schedEndTime}
                                    onChange={setSchedEndTime}
                                    className="h-11 text-base tabular-nums"
                                />
                            </div>
                        </div>

                        {/* Warning: schedule < 8h */}
                        {schedDuration > 0 && schedDuration < 8 && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-md px-2.5 py-1.5">
                                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                <span>เวรที่กำหนดน้อยกว่า 8 ชม. ({Math.round(schedDuration * 10) / 10} ชม.)</span>
                            </div>
                        )}
                    </div>

                    {/* Copy Schedule → Actual */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full text-xs gap-1.5 border-dashed"
                        onClick={() => {
                            setActualStartTime(schedStartTime);
                            setActualEndTime(schedEndTime);
                            setActualEndNextDay(schedEndNextDay);
                        }}
                    >
                        <Copy className="h-3.5 w-3.5" />
                        ทำงานตรงเวลา — คัดลอกเวลากำหนดไปเวลาจริง
                    </Button>

                    <Separator />

                    {/* Actual Time */}
                    <div className="space-y-3">
                        <Label className="text-sm font-semibold flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            เวลาจริง (Actual)
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label className="text-xs text-muted-foreground">เข้างาน</Label>
                                <TimeInput24
                                    value={actualStartTime}
                                    onChange={setActualStartTime}
                                    className="h-11 text-base tabular-nums"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs text-muted-foreground">ออกงาน</Label>
                                    <button
                                        type="button"
                                        className={`text-[10px] leading-none px-2 py-1 rounded-full font-medium transition-colors ${actualEndNextDay
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                            }`}
                                        onClick={() => setActualEndNextDay(!actualEndNextDay)}
                                    >
                                        +1 วัน
                                    </button>
                                </div>
                                <TimeInput24
                                    value={actualEndTime}
                                    onChange={setActualEndTime}
                                    className="h-11 text-base tabular-nums"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Real-time Calculation Preview */}
                    <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-3">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                                คำนวณอัตโนมัติ
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div>
                                    <p className="text-lg font-bold tabular-nums">{breakdown.normalHours}</p>
                                    <p className="text-xs text-muted-foreground">ชม. ปกติ</p>
                                </div>
                                <div>
                                    <Badge
                                        variant="secondary"
                                        className="gradient-card-afternoon w-full justify-center py-1.5"
                                    >
                                        <Sun className="h-3 w-3 mr-1" />
                                        <span className="font-bold tabular-nums">{breakdown.afternoonHours}</span>
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">ชม. บ่าย</p>
                                </div>
                                <div>
                                    <Badge
                                        variant="secondary"
                                        className={`w-full justify-center py-1.5 ${breakdown.otHours < 0 ? 'bg-red-100 text-red-700' : 'gradient-card-ot'}`}
                                    >
                                        <Moon className="h-3 w-3 mr-1" />
                                        <span className="font-bold tabular-nums">{breakdown.otHours}</span>
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">ชม. OT</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">หมายเหตุ (Notes)</Label>
                        <Textarea
                            placeholder="บันทึกเพิ่มเติม..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 text-destructive text-sm p-3 animate-fade-in">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        {existingShift && (
                            <Button
                                variant="outline"
                                className="text-destructive hover:bg-destructive/10"
                                onClick={handleDelete}
                                disabled={deleting}
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        )}
                        <Button
                            className="flex-1 h-11 gradient-header hover:opacity-90"
                            onClick={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
