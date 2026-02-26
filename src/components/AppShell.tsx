'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Stethoscope, Home, LayoutDashboard, LogOut, Users
} from 'lucide-react';
import Link from 'next/link';
import type { Profile } from '@/lib/types';

interface AppShellProps {
    children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Admin',
    manager: 'หัวหน้า',
    nurse: 'พยาบาล',
    pending: 'รอการอนุมัติ',
};

export default function AppShell({ children }: AppShellProps) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (data) setProfile(data as Profile);
        }
        loadProfile();
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const isManager = profile?.role === 'admin' || profile?.role === 'manager';
    const isAdmin = profile?.role === 'admin';
    const initials = profile?.full_name
        ?.split(' ')
        .map((w) => w[0])
        .join('')
        .substring(0, 2)
        .toUpperCase() || '?';

    return (
        <div className="min-h-screen bg-background">
            {/* Top Header */}
            <header className="sticky top-0 z-50 gradient-header text-white shadow-lg">
                <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <Stethoscope className="h-6 w-6" />
                        <span className="font-bold text-lg tracking-tight">ShiftCare</span>
                    </Link>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <div className="px-2 py-2">
                                <p className="text-sm font-medium">{profile?.full_name}</p>
                                <p className="text-xs text-muted-foreground">
                                    @{profile?.username} • {ROLE_LABELS[profile?.role || ''] || profile?.role}
                                </p>
                            </div>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                                <LogOut className="h-4 w-4 mr-2" />
                                ออกจากระบบ
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-lg mx-auto px-4 py-4">
                {children}
            </main>

            {/* Bottom Nav (Manager/Admin get tabs) */}
            {isManager && (
                <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t shadow-lg">
                    <div className="max-w-lg mx-auto flex">
                        <Link
                            href="/"
                            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${pathname === '/' ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            <Home className="h-5 w-5" />
                            หน้าหลัก
                        </Link>
                        <Link
                            href="/admin"
                            className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${pathname === '/admin' ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            <LayoutDashboard className="h-5 w-5" />
                            จัดการเวร
                        </Link>
                        {isAdmin && (
                            <Link
                                href="/admin/users"
                                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${pathname === '/admin/users' ? 'text-primary' : 'text-muted-foreground'
                                    }`}
                            >
                                <Users className="h-5 w-5" />
                                จัดการผู้ใช้
                            </Link>
                        )}
                    </div>
                </nav>
            )}
        </div>
    );
}
