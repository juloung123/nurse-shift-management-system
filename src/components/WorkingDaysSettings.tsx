'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Settings2, Save, Loader2, CalendarDays } from 'lucide-react';
import { getWardSettings, setWardSettings } from '@/lib/supabase/actions';

interface WorkingDaysSettingsProps {
    periodKey: string;
    canEdit: boolean; // admin or manager
    onWorkingDaysChange?: (days: number) => void;
}

export default function WorkingDaysSettings({ periodKey, canEdit, onWorkingDaysChange }: WorkingDaysSettingsProps) {
    const [workingDays, setWorkingDays] = useState<number>(22);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editValue, setEditValue] = useState(22);
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);

    const load = useCallback(async () => {
        const settings = await getWardSettings(periodKey);
        const days = settings?.working_days ?? 22;
        setWorkingDays(days);
        setEditValue(days);
        setLoaded(true);
        onWorkingDaysChange?.(days);
    }, [periodKey, onWorkingDaysChange]);

    useEffect(() => {
        load();
    }, [load]);

    const handleSave = async () => {
        setLoading(true);
        const result = await setWardSettings(periodKey, editValue);
        if (result.success) {
            setWorkingDays(editValue);
            onWorkingDaysChange?.(editValue);
            setDialogOpen(false);
        }
        setLoading(false);
    };

    if (!loaded) return null;

    return (
        <>
            {/* Badge / Button */}
            <button
                type="button"
                className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                    border transition-colors
                    ${canEdit
                        ? 'bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 cursor-pointer'
                        : 'bg-muted/50 border-muted-foreground/10 text-muted-foreground cursor-default'
                    }
                `}
                onClick={() => canEdit && setDialogOpen(true)}
                title={canEdit ? 'คลิกเพื่อตั้งค่าวันทำการ' : 'วันทำการเดือนนี้'}
            >
                <CalendarDays className="h-3.5 w-3.5" />
                <span>วันทำการ: {workingDays} วัน</span>
                {canEdit && <Settings2 className="h-3 w-3 opacity-60" />}
            </button>

            {/* Edit Dialog */}
            {canEdit && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <CalendarDays className="h-5 w-5" />
                                ตั้งค่าวันทำการ
                            </DialogTitle>
                            <DialogDescription>
                                กำหนดจำนวนวันทำการของวอร์ดในรอบเดือนนี้
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label>จำนวนวันทำการ (วัน)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={31}
                                    value={editValue}
                                    onChange={(e) => setEditValue(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="h-12 text-center text-lg font-bold tabular-nums"
                                />
                                <p className="text-xs text-muted-foreground">
                                    หากพยาบาลทำงานเกินจำนวนนี้ วันที่เกินจะนับเป็น OT
                                </p>
                            </div>

                            <Button
                                className="w-full h-11 gradient-header hover:opacity-90"
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
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
