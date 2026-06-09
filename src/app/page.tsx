'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      router.replace(data.session ? '/fixtures' : '/auth');
    });

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-background text-body">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="mb-2 text-sm uppercase tracking-widest text-accent">FIFA Predictor MVP</p>
          <h1 className="text-4xl font-bold text-heading">Predict matches. Climb leaderboard. Evolve your character.</h1>
          <p className="mt-4 text-muted">
            v1 foundation is live locally. Next step: auth, fixtures ingestion, and prediction lock engine.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="font-semibold text-heading">Fixtures</h2>
            <p className="mt-2 text-sm text-muted">Upcoming matches with kickoff-lock rules.</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="font-semibold text-heading">Predictions</h2>
            <p className="mt-2 text-sm text-muted">One prediction per user per match.</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <h2 className="font-semibold text-heading">Leaderboard</h2>
            <p className="mt-2 text-sm text-muted">Points, streaks, and character tiers.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/auth" className="rounded-lg border border-border-default px-4 py-2 font-semibold text-body hover:bg-surface-raised">
            Login / Sign up
          </Link>
          <Link href="/fixtures" className="rounded-lg bg-accent px-4 py-2 font-semibold text-white hover:bg-accent-hover">
            View Fixtures
          </Link>
          <Link href="/leaderboard" className="rounded-lg border border-border-default px-4 py-2 font-semibold text-body hover:bg-surface-raised">
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
