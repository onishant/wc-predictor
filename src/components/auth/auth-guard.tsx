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

    let cancelled = false;

    async function checkSession() {
      // Small delay to let session flush to storage after login
      await new Promise(r => setTimeout(r, 100));
      if (cancelled) return;

      const { data: { session } } = await supabase!.auth.getSession();

      if (cancelled) return;

      if (session) {
        setAuthed(true);
      } else {
        // Retry once after a longer delay
        await new Promise(r => setTimeout(r, 500));
        if (cancelled) return;

        const { data: { session: retrySession } } = await supabase!.auth.getSession();
        if (cancelled) return;

        if (retrySession) {
          setAuthed(true);
        } else {
          router.replace('/auth');
        }
      }
    }

    checkSession();

    return () => { cancelled = true; };
  }, [skipCheck, router, pathname]);

  if (skipCheck || authed) {
    return <>{children}</>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted">Loading…</p>
    </main>
  );
}
