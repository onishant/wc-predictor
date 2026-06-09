'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

const PUBLIC_PATHS = ['/auth'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'authed' | 'redirecting'>('loading');

  const isPublic = PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
  const skipCheck = isPublic || !supabase;

  useEffect(() => {
    if (skipCheck) {
      setState('authed');
      return;
    }

    let cancelled = false;

    supabase!.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;

      if (session) {
        setState('authed');
      } else {
        setState('redirecting');
        router.replace('/auth');
      }
    });

    return () => { cancelled = true; };
  }, [skipCheck, router]);

  if (skipCheck || state === 'authed') {
    return <>{children}</>;
  }

  if (state === 'redirecting') {
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted">Loading…</p>
    </main>
  );
}
