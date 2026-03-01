import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NurseHome from '@/components/NurseHome';
import type { Profile } from '@/lib/types';

export default async function MyShiftsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) redirect('/login');

    const typedProfile = profile as Profile;

    // Only manager can access this page
    if (typedProfile.role !== 'manager') {
        redirect('/');
    }

    return (
        <div className="min-h-screen">
            <NurseHome profile={typedProfile} />
        </div>
    );
}
