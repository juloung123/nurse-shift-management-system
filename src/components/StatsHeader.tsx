'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Sun, Moon, TrendingUp, ArrowRight } from 'lucide-react';
import type { MonthlyAccumulation } from '@/lib/types';

interface StatsHeaderProps {
    prevAfternoonCarryOver: number;
    prevOtCarryOver: number;
    accumulation: MonthlyAccumulation;
}

export default function StatsHeader({
    prevAfternoonCarryOver,
    prevOtCarryOver,
    accumulation,
}: StatsHeaderProps) {
    return (
        <div className="space-y-3">
            {/* Carry-over from previous month */}
            {(prevAfternoonCarryOver > 0 || prevOtCarryOver > 0) && (
                <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
                    <CardContent className="p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <ArrowRight className="h-3 w-3" />
                            ยกมาจากเดือนก่อน (Carry Over)
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex items-center gap-2">
                                <Sun className="h-4 w-4 text-amber-500" />
                                <div>
                                    <span className="font-semibold tabular-nums">{prevAfternoonCarryOver}</span>
                                    <span className="text-xs text-muted-foreground ml-1">ชม. บ่าย</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Moon className="h-4 w-4 text-teal-500" />
                                <div>
                                    <span className="font-semibold tabular-nums">{prevOtCarryOver}</span>
                                    <span className="text-xs text-muted-foreground ml-1">ชม. OT</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Current month accumulation */}
            <div className="grid grid-cols-2 gap-3">
                {/* Afternoon Card */}
                <Card className="gradient-card-afternoon border-0 shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Sun className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-semibold text-amber-800">เวรบ่าย</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-amber-900">
                            {accumulation.totalAfternoonHours}
                            <span className="text-sm font-normal ml-1">ชม.</span>
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-amber-600" />
                            <span className="text-xs text-amber-700">
                                {accumulation.afternoonShifts} เวร
                                {accumulation.afternoonRemainder > 0 && (
                                    <> + {accumulation.afternoonRemainder} ชม.</>
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* OT Card */}
                <Card className="gradient-card-ot border-0 shadow-sm">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Moon className="h-4 w-4 text-teal-600" />
                            <span className="text-xs font-semibold text-teal-800">OT</span>
                        </div>
                        <p className="text-2xl font-bold tabular-nums text-teal-900">
                            {accumulation.totalOtHours}
                            <span className="text-sm font-normal ml-1">ชม.</span>
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                            <TrendingUp className="h-3 w-3 text-teal-600" />
                            <span className="text-xs text-teal-700">
                                {accumulation.otShifts} เวร
                                {accumulation.otRemainder > 0 && (
                                    <> + {accumulation.otRemainder} ชม.</>
                                )}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
