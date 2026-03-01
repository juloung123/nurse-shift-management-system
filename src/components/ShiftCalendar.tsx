'use client';

import { useMemo } from 'react';
import { toDateString, formatMonthThai } from '@/lib/date-utils';
import type { Shift } from '@/lib/types';

const DAY_HEADERS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
const MONTH_NAMES_TH = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

interface ShiftCalendarProps {
    periodDates: Date[];
    shiftsByDate: Map<string, Shift>;
    onDayClick: (date: Date, shift?: Shift) => void;
}

interface CalendarMonth {
    label: string;
    year: number;
    month: number; // 0-indexed
    weeks: (Date | null)[][];
}

/**
 * Group period dates into calendar months, each with week rows
 * padded to start on the correct day of week.
 */
function buildCalendarMonths(dates: Date[]): CalendarMonth[] {
    if (dates.length === 0) return [];

    // Group dates by year-month
    const monthGroups = new Map<string, Date[]>();
    for (const d of dates) {
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        if (!monthGroups.has(key)) monthGroups.set(key, []);
        monthGroups.get(key)!.push(d);
    }

    const calendarMonths: CalendarMonth[] = [];

    for (const [, monthDates] of monthGroups) {
        const firstDate = monthDates[0];
        const year = firstDate.getFullYear();
        const month = firstDate.getMonth();
        const label = `${MONTH_NAMES_TH[month]} ${year + 543}`;

        // Build week rows
        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];

        // Pad the first week with nulls for days before the first date
        const firstDow = monthDates[0].getDay(); // 0=Sun
        for (let i = 0; i < firstDow; i++) {
            currentWeek.push(null);
        }

        for (const d of monthDates) {
            const dow = d.getDay();
            // If it's Sunday and we already have items, start a new week
            if (dow === 0 && currentWeek.length > 0) {
                // Pad remaining slots of previous week
                while (currentWeek.length < 7) currentWeek.push(null);
                weeks.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(d);
        }

        // Pad and push last week
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) currentWeek.push(null);
            weeks.push(currentWeek);
        }

        calendarMonths.push({ label, year, month, weeks });
    }

    return calendarMonths;
}

function formatShiftTime(shift: Shift): string {
    try {
        const startH = new Date(shift.sched_start).getHours();
        const endH = new Date(shift.sched_end).getHours();
        return `${startH}-${endH === 0 ? 24 : endH}`;
    } catch {
        return '';
    }
}

export default function ShiftCalendar({ periodDates, shiftsByDate, onDayClick }: ShiftCalendarProps) {
    const todayStr = useMemo(() => toDateString(new Date()), []);
    const calendarMonths = useMemo(() => buildCalendarMonths(periodDates), [periodDates]);

    return (
        <div className="space-y-3">
            {calendarMonths.map((cm) => (
                <div key={`${cm.year}-${cm.month}`} className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    {/* Month header */}
                    <div className="px-4 py-2.5 border-b bg-muted/30">
                        <h3 className="text-sm font-bold text-foreground">{cm.label}</h3>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 border-b bg-muted/20">
                        {DAY_HEADERS.map((dh, i) => (
                            <div
                                key={dh}
                                className={`text-center text-[11px] font-semibold py-1.5 ${i === 0 || i === 6 ? 'text-rose-500' : 'text-muted-foreground'
                                    }`}
                            >
                                {dh}
                            </div>
                        ))}
                    </div>

                    {/* Week rows */}
                    <div>
                        {cm.weeks.map((week, wi) => (
                            <div key={wi} className="grid grid-cols-7 border-b last:border-b-0">
                                {week.map((day, di) => {
                                    if (!day) {
                                        return <div key={`empty-${di}`} className="min-h-[72px] bg-muted/10" />;
                                    }

                                    const dateStr = toDateString(day);
                                    const shift = shiftsByDate.get(dateStr);
                                    const isToday = dateStr === todayStr;
                                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                                    const hasAfternoon = shift && shift.calculated_afternoon_hours > 0;
                                    const hasOT = shift && shift.calculated_ot_hours !== 0;
                                    const negativeOT = shift && shift.calculated_ot_hours < 0;

                                    return (
                                        <button
                                            key={dateStr}
                                            type="button"
                                            className={`
                                                min-h-[72px] p-1 text-left transition-colors relative
                                                hover:bg-primary/5 active:bg-primary/10
                                                ${isWeekend ? 'bg-rose-50/30' : ''}
                                                ${isToday ? 'ring-2 ring-primary ring-inset' : ''}
                                                ${di < 6 ? 'border-r' : ''}
                                            `}
                                            onClick={() => onDayClick(day, shift || undefined)}
                                        >
                                            {/* Day number */}
                                            <div className={`
                                                text-sm font-bold leading-none mb-1
                                                ${isToday ? 'bg-primary text-white rounded-full w-6 h-6 flex items-center justify-center text-xs' : ''}
                                                ${isWeekend && !isToday ? 'text-rose-500' : ''}
                                                ${!isWeekend && !isToday ? 'text-foreground' : ''}
                                            `}>
                                                {day.getDate()}
                                            </div>

                                            {/* Shift info */}
                                            {shift && (
                                                <div className="space-y-0.5">
                                                    {/* Schedule time */}
                                                    <div className="text-[10px] font-medium text-muted-foreground leading-tight truncate">
                                                        {formatShiftTime(shift)}
                                                    </div>

                                                    {/* Indicator dots/bars */}
                                                    <div className="flex flex-col gap-0.5">
                                                        {hasAfternoon && (
                                                            <div className="h-[3px] rounded-full bg-amber-400 w-full" title={`บ่าย ${shift.calculated_afternoon_hours} ชม.`} />
                                                        )}
                                                        {hasOT && (
                                                            <div
                                                                className={`h-[3px] rounded-full w-full ${negativeOT ? 'bg-red-400' : 'bg-teal-400'}`}
                                                                title={`OT ${shift.calculated_ot_hours} ชม.`}
                                                            />
                                                        )}
                                                    </div>

                                                    {/* Compact hour badges */}
                                                    {(hasAfternoon || hasOT) && (
                                                        <div className="flex flex-wrap gap-0.5 mt-0.5">
                                                            {hasAfternoon && (
                                                                <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 rounded px-0.5">
                                                                    บ{shift.calculated_afternoon_hours}
                                                                </span>
                                                            )}
                                                            {hasOT && (
                                                                <span className={`text-[9px] font-semibold rounded px-0.5 ${negativeOT ? 'text-red-600 bg-red-50' : 'text-teal-600 bg-teal-50'}`}>
                                                                    OT{shift.calculated_ot_hours}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Empty day indicator */}
                                            {!shift && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity">
                                                    <span className="text-lg text-primary">+</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
