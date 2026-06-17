'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getPendingPasswordResets,
    resolvePasswordReset,
    rejectPasswordReset,
} from '@/lib/supabase/actions';
import type { PasswordResetRequestWithProfile } from '@/lib/types';
import { Loader2, KeyRound, Clock, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    manager: 'หัวหน้า',
    nurse: 'พยาบาล',
    pending: 'รออนุมัติ',
};

function formatRequestedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('th-TH', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
}

export default function PasswordResetRequests() {
    const [requests, setRequests] = useState<PasswordResetRequestWithProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Resolve-dialog state
    const [resolveTarget, setResolveTarget] = useState<PasswordResetRequestWithProfile | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [dialogError, setDialogError] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getPendingPasswordResets();
            setRequests(data);
        } catch {
            setError('โหลดคำขอไม่สำเร็จ');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const closeDialog = useCallback(() => {
        setResolveTarget(null);
        setNewPassword('');
        setConfirmPassword('');
        setDialogError('');
    }, []);

    const handleReject = useCallback(async (id: string) => {
        setActionLoading(id);
        setError('');
        try {
            const result = await rejectPasswordReset(id);
            if (!result.success) {
                setError(result.error || 'ปฏิเสธไม่สำเร็จ');
                return;
            }
            setRequests((prev) => prev.filter((r) => r.id !== id));
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    }, []);

    async function handleResolve() {
        if (!resolveTarget) return;
        setDialogError('');

        if (newPassword.length < 6) {
            setDialogError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        if (newPassword !== confirmPassword) {
            setDialogError('รหัสผ่านไม่ตรงกัน');
            return;
        }

        const targetId = resolveTarget.id;
        setActionLoading(targetId);
        try {
            const result = await resolvePasswordReset(targetId, newPassword);
            if (!result.success) {
                setDialogError(result.error || 'ตั้งรหัสไม่สำเร็จ');
                return;
            }
            setRequests((prev) => prev.filter((r) => r.id !== targetId));
            closeDialog();
        } catch {
            setDialogError('เกิดข้อผิดพลาด กรุณาลองใหม่');
        } finally {
            setActionLoading(null);
        }
    }

    // Nothing pending and not loading → hide the whole section.
    if (!loading && requests.length === 0) return null;

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <h2 className="text-sm font-bold">คำขอลืมรหัสผ่าน</h2>
                {requests.length > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">{requests.length}</Badge>
                )}
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 text-center animate-fade-in">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    {requests.map((req) => {
                        const profile = req.profiles;
                        const name = profile?.full_name ?? 'ไม่ทราบชื่อ';
                        const username = profile?.username ?? '?';
                        const role = profile?.role ?? 'nurse';
                        const isLoading = actionLoading === req.id;

                        return (
                            <Card key={req.id} className="border-amber-300 bg-amber-50/30">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-9 w-9 shrink-0">
                                            <AvatarFallback className="bg-amber-100 text-amber-700 text-xs font-bold">
                                                {getInitials(name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate text-sm">
                                                {name}
                                                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                                    @{username}
                                                </span>
                                            </p>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                ขอเมื่อ {formatRequestedAt(req.requested_at)}
                                            </p>
                                        </div>
                                        <Badge className="bg-blue-50 text-blue-700 text-xs shrink-0">
                                            {ROLE_LABELS[role] ?? role}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            className="h-8 flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                                            onClick={() => {
                                                setResolveTarget(req);
                                                setDialogError('');
                                            }}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <KeyRound className="h-3.5 w-3.5 mr-1" />
                                            )}
                                            ตั้งรหัสใหม่
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-8 px-3 text-muted-foreground"
                                            onClick={() => handleReject(req.id)}
                                            disabled={isLoading}
                                        >
                                            ปฏิเสธ
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Set new password dialog */}
            <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && closeDialog()}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <KeyRound className="h-5 w-5" />
                            ตั้งรหัสผ่านใหม่
                        </DialogTitle>
                        <DialogDescription>
                            ตั้งรหัสผ่านใหม่ให้{' '}
                            <strong>{resolveTarget?.profiles?.full_name}</strong>{' '}
                            (@{resolveTarget?.profiles?.username}) แล้วแจ้งรหัสนี้ให้ผู้ใช้ทางอื่น
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="new-password" className="text-sm font-medium">
                                รหัสผ่านใหม่
                            </Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="อย่างน้อย 6 ตัวอักษร"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                autoFocus
                                autoComplete="new-password"
                                className="h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password" className="text-sm font-medium">
                                ยืนยันรหัสผ่านใหม่
                            </Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="กรอกรหัสผ่านอีกครั้ง"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                autoComplete="new-password"
                                className="h-11"
                            />
                        </div>

                        {dialogError && (
                            <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 text-center animate-fade-in">
                                {dialogError}
                            </div>
                        )}

                        <div className="rounded-lg bg-amber-50 text-amber-800 text-xs p-3 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>
                                หลังตั้งรหัสแล้ว โปรดแจ้งรหัสผ่านใหม่นี้ให้ผู้ใช้ทราบทาง LINE หรือด้วยตนเอง
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                        <Button
                            variant="outline"
                            onClick={closeDialog}
                            disabled={!!actionLoading}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={handleResolve}
                            disabled={!!actionLoading || newPassword.length < 6}
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            ยืนยันตั้งรหัสใหม่
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
