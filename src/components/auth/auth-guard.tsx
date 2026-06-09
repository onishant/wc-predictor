'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const PUBLIC_PATHS = ['/auth'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authed, setAuthed] = useState(false);

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const skipCheck = isPublic || !supabase;

  useEffect(() => {
    if (skipCheck) return;

    supabase!.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/auth');
        return;
      }

      // Verify user still exists in database
      const { data: profile } = await supabase!
        .from('users_profile')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        await supabase!.auth.signOut();
        router.replace('/auth');
        return;
      }

      setAuthed(true);
    });

    const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [skipCheck, router]);

  if (!skipCheck && !authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading…</p>
      </main>
    );
  }

  return <>{children}</>;
}
