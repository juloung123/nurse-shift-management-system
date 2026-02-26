'use client';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from 'lucide-react';
import { getAvailablePeriods } from '@/lib/date-utils';
import type { PeriodRange } from '@/lib/types';

interface PeriodSelectorProps {
    selectedPeriod: string;
    onPeriodChange: (periodKey: string) => void;
}

export default function PeriodSelector({ selectedPeriod, onPeriodChange }: PeriodSelectorProps) {
    const periods: PeriodRange[] = getAvailablePeriods(12);

    return (
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedPeriod} onValueChange={onPeriodChange}>
                <SelectTrigger className="w-full h-10 text-sm font-medium">
                    <SelectValue placeholder="เลือกรอบเดือน" />
                </SelectTrigger>
                <SelectContent>
                    {periods.map((period) => (
                        <SelectItem key={period.periodKey} value={period.periodKey}>
                            {period.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
