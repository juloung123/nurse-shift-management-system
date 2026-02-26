import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminShiftManage from '@/components/AdminShiftManage';

export default async function AdminPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    // Allow admin and manager
    if (!profile || (profile.role !== 'admin' && profile.role !== 'manager')) redirect('/');

    return <AdminShiftManage />;
}
