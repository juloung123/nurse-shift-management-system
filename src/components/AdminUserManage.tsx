'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getAllProfiles, updateUserRole, deleteUser } from '@/lib/supabase/actions';
import PasswordResetRequests from './PasswordResetRequests';
import type { Profile, UserRole } from '@/lib/types';
import { Loader2, Users, Shield, ShieldCheck, User, Clock, Search, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
    admin: { label: 'Admin', color: 'bg-purple-100 text-purple-700', icon: ShieldCheck },
    manager: { label: 'หัวหน้า', color: 'bg-blue-100 text-blue-700', icon: Shield },
    nurse: { label: 'พยาบาล', color: 'bg-green-100 text-green-700', icon: User },
    pending: { label: 'รอการอนุมัติ', color: 'bg-amber-100 text-amber-700', icon: Clock },
};

export default function AdminUserManage() {
    const [users, setUsers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState('');

    // Delete confirmation dialog
    const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        try {
            const profiles = await getAllProfiles();
            setUsers(profiles);
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadUsers(); }, [loadUsers]);

    // Filtered & sorted users: pending first, then by name
    const filteredUsers = useMemo(() => {
        let list = users;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (u) => u.full_name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
            );
        }
        return list.sort((a, b) => {
            if (a.role === 'pending' && b.role !== 'pending') return -1;
            if (a.role !== 'pending' && b.role === 'pending') return 1;
            return a.full_name.localeCompare(b.full_name);
        });
    }, [users, searchQuery]);

    const pendingCount = useMemo(() => users.filter((u) => u.role === 'pending').length, [users]);

    const handleRoleChange = useCallback(async (userId: string, newRole: UserRole) => {
        setActionLoading(userId);
        setError('');
        try {
            const result = await updateUserRole(userId, newRole);
            if (!result.success) {
                setError(result.error || 'เปลี่ยน role ไม่สำเร็จ');
                return;
            }
            // Update local state
            setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    }, []);

    const handleApprove = useCallback(async (userId: string) => {
        await handleRoleChange(userId, 'nurse');
    }, [handleRoleChange]);

    const handleDelete = useCallback(async () => {
        if (!deleteTarget) return;
        setActionLoading(deleteTarget.id);
        setError('');
        try {
            const result = await deleteUser(deleteTarget.id);
            if (!result.success) {
                setError(result.error || 'ลบไม่สำเร็จ');
                return;
            }
            setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch {
            setError('เกิดข้อผิดพลาด');
        } finally {
            setActionLoading(null);
        }
    }, [deleteTarget]);

    const getInitials = (name: string) =>
        name.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();

    return (
        <div className="space-y-4 pb-24">
            <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h1 className="text-lg font-bold">จัดการผู้ใช้</h1>
                {pendingCount > 0 && (
                    <Badge className="bg-amber-500 text-white text-xs">{pendingCount} รอการอนุมัติ</Badge>
                )}
            </div>

            <PasswordResetRequests />

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ค้นหาผู้ใช้..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 pl-10"
                />
            </div>

            {error && (
                <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 text-center animate-fade-in">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredUsers.map((user) => {
                        const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.nurse;
                        const RoleIcon = config.icon;
                        const isLoading = actionLoading === user.id;

                        return (
                            <Card key={user.id} className={`transition-all ${user.role === 'pending' ? 'border-amber-300 bg-amber-50/30' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                                                {getInitials(user.full_name)}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold truncate text-sm">{user.full_name}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>

                                        {/* Pending: quick approve/reject buttons */}
                                        {user.role === 'pending' ? (
                                            <div className="flex items-center gap-1.5">
                                                <Button
                                                    size="sm"
                                                    className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white"
                                                    onClick={() => handleApprove(user.id)}
                                                    disabled={isLoading}
                                                >
                                                    {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                                                    อนุมัติ
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 px-3 text-red-600 border-red-200 hover:bg-red-50"
                                                    onClick={() => setDeleteTarget(user)}
                                                    disabled={isLoading}
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            /* Active users: role dropdown */
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={user.role}
                                                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                                                    disabled={isLoading}
                                                >
                                                    <SelectTrigger className={`h-8 w-[130px] text-xs font-medium ${config.color}`}>
                                                        <RoleIcon className="h-3.5 w-3.5 mr-1" />
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="admin">
                                                            <div className="flex items-center gap-2">
                                                                <ShieldCheck className="h-3.5 w-3.5" /> Admin
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="manager">
                                                            <div className="flex items-center gap-2">
                                                                <Shield className="h-3.5 w-3.5" /> หัวหน้า
                                                            </div>
                                                        </SelectItem>
                                                        <SelectItem value="nurse">
                                                            <div className="flex items-center gap-2">
                                                                <User className="h-3.5 w-3.5" /> พยาบาล
                                                            </div>
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                    onClick={() => setDeleteTarget(user)}
                                                    disabled={isLoading}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">ไม่พบผู้ใช้</div>
                    )}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            ยืนยันการลบ
                        </DialogTitle>
                        <DialogDescription>
                            ต้องการลบผู้ใช้ <strong>{deleteTarget?.full_name}</strong> (@{deleteTarget?.username}) ใช่หรือไม่?
                            การกระทำนี้ไม่สามารถย้อนกลับได้
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>ยกเลิก</Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={actionLoading === deleteTarget?.id}
                        >
                            {actionLoading === deleteTarget?.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            ลบผู้ใช้
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
