'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Stethoscope, LogIn, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [username, setUsername] = useState('');
    const [fullName, setFullName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [registerSuccess, setRegisterSuccess] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const input = username.toLowerCase().trim();
            const email = input.includes('@') ? input : `${input}@shiftcare.app`;

            let { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            // Fallback: try legacy @nurse.local domain for existing users
            if (authError && !input.includes('@')) {
                const legacyEmail = `${input}@nurse.local`;
                const legacyResult = await supabase.auth.signInWithPassword({
                    email: legacyEmail,
                    password,
                });
                authError = legacyResult.error;
            }

            if (authError) {
                setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
                return;
            }

            router.push('/');
            router.refresh();
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    }

    async function handleRegister(e: React.FormEvent) {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('รหัสผ่านไม่ตรงกัน');
            return;
        }
        if (password.length < 6) {
            setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }
        if (!username.trim()) {
            setError('กรุณากรอกชื่อผู้ใช้');
            return;
        }

        setLoading(true);
        try {
            const cleanUsername = username.toLowerCase().trim();
            const email = `${cleanUsername}@shiftcare.app`;

            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName.trim() || cleanUsername,
                        role: 'pending',
                    },
                },
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            // Sign out immediately — pending users shouldn't be logged in
            await supabase.auth.signOut();
            setRegisterSuccess(true);
        } catch {
            setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    }

    // Registration success screen
    if (registerSuccess) {
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
                        <h2 className="text-xl font-bold">สมัครสมาชิกสำเร็จ!</h2>
                        <p className="text-muted-foreground">
                            กรุณารอ Admin อนุมัติบัญชีของคุณ<br />
                            หลังจากได้รับการอนุมัติ จะสามารถเข้าสู่ระบบได้
                        </p>
                        <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => {
                                setRegisterSuccess(false);
                                setMode('login');
                                setUsername('');
                                setPassword('');
                                setConfirmPassword('');
                                setFullName('');
                            }}
                        >
                            กลับไปหน้าเข้าสู่ระบบ
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/5 via-background to-accent/10" />
                <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
            </div>

            <Card className="w-full max-w-md shadow-xl border-0 shadow-primary/5 animate-slide-up">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 h-16 w-16 rounded-2xl gradient-header flex items-center justify-center shadow-lg shadow-primary/20">
                        <Stethoscope className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold tracking-tight">
                        {mode === 'login' ? 'ระบบบันทึกเวร' : 'สมัครสมาชิก'}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                        {mode === 'login' ? 'Nurse Shift Management' : 'สร้างบัญชีใหม่'}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-4">
                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="username" className="text-sm font-medium">
                                    ชื่อผู้ใช้ หรือ อีเมล
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

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-sm font-medium">
                                    รหัสผ่าน (Password)
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="กรอกรหัสผ่าน"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    className="h-12 text-base"
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 text-center animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold gradient-header hover:opacity-90 transition-opacity"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <LogIn className="h-5 w-5 mr-2" />
                                )}
                                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                            </Button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    className="text-sm text-primary hover:underline font-medium"
                                    onClick={() => { setMode('register'); setError(''); }}
                                >
                                    ยังไม่มีบัญชี? สมัครสมาชิก
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="reg-username" className="text-sm font-medium">
                                    ชื่อผู้ใช้ (Username)
                                </Label>
                                <Input
                                    id="reg-username"
                                    type="text"
                                    placeholder="เช่น somchai"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    autoComplete="username"
                                    className="h-12 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-fullname" className="text-sm font-medium">
                                    ชื่อ-นามสกุล (Full Name)
                                </Label>
                                <Input
                                    id="reg-fullname"
                                    type="text"
                                    placeholder="เช่น สมชาย ใจดี"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="h-12 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-password" className="text-sm font-medium">
                                    รหัสผ่าน (Password)
                                </Label>
                                <Input
                                    id="reg-password"
                                    type="password"
                                    placeholder="อย่างน้อย 6 ตัวอักษร"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="h-12 text-base"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="reg-confirm" className="text-sm font-medium">
                                    ยืนยันรหัสผ่าน
                                </Label>
                                <Input
                                    id="reg-confirm"
                                    type="password"
                                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className="h-12 text-base"
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg bg-destructive/10 text-destructive text-sm p-3 text-center animate-fade-in">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold gradient-header hover:opacity-90 transition-opacity"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : (
                                    <UserPlus className="h-5 w-5 mr-2" />
                                )}
                                {loading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
                            </Button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    className="text-sm text-primary hover:underline font-medium"
                                    onClick={() => { setMode('login'); setError(''); }}
                                >
                                    มีบัญชีแล้ว? เข้าสู่ระบบ
                                </button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
