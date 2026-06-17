'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '@/lib/supabase/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { KeyRound, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        try {
            // Always results in the generic success screen — the action never
            // reveals whether the username exists.
            await requestPasswordReset(username);
        } catch {
            // Ignore: still show generic success to avoid account enumeration.
        } finally {
            setLoading(false);
            setSubmitted(true);
        }
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-accent/10" />
                </div>
                <Card className="w-full max-w-md shadow-xl border-0 shadow-primary/5 animate-slide-up">
                    <CardContent className="pt-8 pb-6 text-center space-y-4">
                        <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle2 className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-bold">ส่งคำขอแล้ว</h2>
                        <p className="text-muted-foreground">
                            หากมีบัญชีนี้ในระบบ<br />
                            Admin จะได้รับคำขอและตั้งรหัสผ่านใหม่ให้คุณ<br />
                            กรุณาติดต่อ Admin เพื่อรับรหัสผ่านใหม่
                        </p>
                        <Button asChild variant="outline" className="mt-4">
                            <Link href="/login">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                กลับไปหน้าเข้าสู่ระบบ
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background decorations (matches login page) */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-accent/10" />
                <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
            </div>

            <Card className="w-full max-w-md shadow-xl border-0 shadow-primary/5 animate-slide-up">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl gradient-header flex items-center justify-center shadow-lg shadow-primary/20">
                        <KeyRound className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        ลืมรหัสผ่าน
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                        กรอกชื่อผู้ใช้เพื่อขอตั้งรหัสผ่านใหม่
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="username" className="text-sm font-medium">
                                ชื่อผู้ใช้ (Username)
                            </Label>
                            <Input
                                id="username"
                                type="text"
                                placeholder="กรอกชื่อผู้ใช้"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoComplete="username"
                                className="h-12 text-base"
                            />
                        </div>

                        <p className="text-xs text-muted-foreground text-center">
                            หลังจากส่งคำขอ Admin จะตั้งรหัสผ่านใหม่และแจ้งให้คุณทราบ
                        </p>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold gradient-header hover:opacity-90 transition-opacity"
                            disabled={loading}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <KeyRound className="h-5 w-5 mr-2" />
                            )}
                            {loading ? 'กำลังส่งคำขอ...' : 'ขอตั้งรหัสผ่านใหม่'}
                        </Button>

                        <div className="text-center pt-2">
                            <Link
                                href="/login"
                                className="text-sm text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                กลับไปหน้าเข้าสู่ระบบ
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
