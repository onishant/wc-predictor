import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Home() {
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    redirect(user ? '/fixtures' : '/auth');
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="mb-2 text-sm uppercase tracking-widest text-cyan-400">FIFA Predictor MVP</p>
          <h1 className="text-4xl font-bold">Predict matches. Climb leaderboard. Evolve your character.</h1>
          <p className="mt-4 text-slate-300">
            v1 foundation is live locally. Next step: auth, fixtures ingestion, and prediction lock engine.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-semibold">Fixtures</h2>
            <p className="mt-2 text-sm text-slate-400">Upcoming matches with kickoff-lock rules.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-semibold">Predictions</h2>
            <p className="mt-2 text-sm text-slate-400">One prediction per user per match.</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-semibold">Leaderboard</h2>
            <p className="mt-2 text-sm text-slate-400">Points, streaks, and character tiers.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/auth" className="rounded-lg border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800">
            Login / Sign up
          </Link>
          <Link href="/fixtures" className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400">
            View Fixtures
          </Link>
          <Link href="/leaderboard" className="rounded-lg border border-slate-700 px-4 py-2 font-semibold hover:bg-slate-800">
            View Leaderboard
          </Link>
        </div>
      </div>
    </main>
  );
}
