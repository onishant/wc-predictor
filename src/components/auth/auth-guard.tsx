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

    let mounted = true;

    // First check session (fast, local storage)
    supabase!.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;

      if (!session) {
        router.replace('/auth');
        return;
      }

      // Verify user still exists in DB
      const { data: profile } = await supabase!
        .from('users_profile')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!profile) {
        await supabase!.auth.signOut();
        router.replace('/auth');
        return;
      }

      setAuthed(true);
    });

    return () => { mounted = false; };
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
