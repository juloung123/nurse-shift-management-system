'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Sun, Moon, FileText, ChevronRight } from 'lucide-react';
import { formatTime, formatMonthThai } from '@/lib/date-utils';
import type { Shift } from '@/lib/types';

interface ShiftCardProps {
    shift: Shift;
    onClick?: () => void;
}

const DAY_NAMES_TH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function ShiftCard({ shift, onClick }: ShiftCardProps) {
    const date = new Date(shift.date + 'T00:00:00');
    const dayName = DAY_NAMES_TH[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    const hasActual = shift.actual_start && shift.actual_end;
    const hasAfternoon = shift.calculated_afternoon_hours > 0;
    const hasOT = shift.calculated_ot_hours !== 0;

    return (
        <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] border-l-4 ${shift.calculated_ot_hours < 0
                ? 'border-l-red-400'
                : hasOT
                    ? 'border-l-nurse-teal'
                    : hasAfternoon
                        ? 'border-l-nurse-amber'
                        : 'border-l-primary/20'
                } ${isWeekend ? 'bg-muted/30' : ''}`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    {/* Left: Date & Schedule */}
                    <div className="flex-1 min-w-0">
                        {/* Date row */}
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`text-lg font-bold tabular-nums ${isWeekend ? 'text-nurse-rose' : ''}`}>
                                {date.getDate()}
                            </span>
                            <span className={`text-sm ${isWeekend ? 'text-nurse-rose' : 'text-muted-foreground'}`}>
                                {dayName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {formatMonthThai(date)}
                            </span>
                        </div>

                        {/* Schedule time */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span className="font-medium">
                                {formatTime(shift.sched_start)} – {formatTime(shift.sched_end)}
                            </span>
                            <span className="text-xs">(กำหนด)</span>
                        </div>

                        {/* Actual time */}
                        {hasActual && (
                            <div className="flex items-center gap-1.5 text-sm mb-2">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-primary" />
                                <span className="font-medium text-primary">
                                    {formatTime(shift.actual_start!)} – {formatTime(shift.actual_end!)}
                                </span>
                                <span className="text-xs text-muted-foreground">(จริง)</span>
                            </div>
                        )}

                        {/* Hours badges */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {hasAfternoon && (
                                <Badge variant="secondary" className="gradient-card-afternoon text-xs font-medium px-2 py-0.5">
                                    <Sun className="h-3 w-3 mr-1" />
                                    บ่าย {shift.calculated_afternoon_hours} ชม.
                                </Badge>
                            )}
                            {hasOT && (
                                <Badge variant="secondary" className={`text-xs font-medium px-2 py-0.5 ${shift.calculated_ot_hours < 0 ? 'bg-red-100 text-red-700' : 'gradient-card-ot'}`}>
                                    <Moon className="h-3 w-3 mr-1" />
                                    OT {shift.calculated_ot_hours} ชม.
                                </Badge>
                            )}
                        </div>

                        {/* Notes */}
                        {shift.notes && (
                            <div className="flex items-start gap-1.5 mt-2 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                                <span className="line-clamp-1">{shift.notes}</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Chevron */}
                    <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0 mt-1" />
                </div>
            </CardContent>
        </Card>
    );
}

// Empty state placeholder card
interface EmptyShiftCardProps {
    date: Date;
    onClick?: () => void;
}

export function EmptyShiftCard({ date, onClick }: EmptyShiftCardProps) {
    const dayName = DAY_NAMES_TH[date.getDay()];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    return (
        <Card
            className={`cursor-pointer transition-all duration-200 hover:shadow-sm hover:bg-muted/50 active:scale-[0.98] border-dashed border-l-4 border-l-transparent ${isWeekend ? 'bg-muted/20' : 'bg-card/50'
                }`}
            onClick={onClick}
        >
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold tabular-nums ${isWeekend ? 'text-nurse-rose/60' : 'text-muted-foreground'}`}>
                            {date.getDate()}
                        </span>
                        <span className="text-sm text-muted-foreground">{dayName}</span>
                        <span className="text-xs text-muted-foreground">{formatMonthThai(date)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground/60">+ เพิ่มเวร</span>
                </div>
            </CardContent>
        </Card>
    );
}
