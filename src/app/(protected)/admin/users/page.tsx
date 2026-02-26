import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminUserManage from '@/components/AdminUserManage';

export default async function AdminUsersPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Only admin can access user management
    if (!profile || profile.role !== 'admin') redirect('/');

    return <AdminUserManage />;
}
