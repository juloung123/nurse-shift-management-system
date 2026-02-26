import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import NurseHome from '@/components/NurseHome';
import AdminDashboard from '@/components/AdminDashboard';
import type { Profile } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export default async function HomePage() {
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

  // Pending users see a waiting message
  if (typedProfile.role === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold">รอการอนุมัติ</h2>
            <p className="text-muted-foreground">
              บัญชีของคุณกำลังรอ Admin อนุมัติ<br />
              กรุณาติดต่อ Admin เพื่อเปิดใช้งาน
            </p>
            <p className="text-xs text-muted-foreground">
              @{typedProfile.username} • {typedProfile.full_name}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {(typedProfile.role === 'admin' || typedProfile.role === 'manager') ? (
        <AdminDashboard />
      ) : (
        <NurseHome profile={typedProfile} />
      )}
    </div>
  );
}
