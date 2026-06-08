import Link from 'next/link';

export function AppNav() {
  return (
    <nav className="flex flex-wrap gap-2 text-sm font-semibold">
      <Link href="/fixtures" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-500 hover:text-cyan-300">
        Fixtures
      </Link>
      <Link href="/teams" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-500 hover:text-cyan-300">
        Teams
      </Link>
      <Link href="/avatar" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-500 hover:text-cyan-300">
        Avatar
      </Link>
      <Link href="/leaderboard" className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:border-cyan-500 hover:text-cyan-300">
        Leaderboard
      </Link>
      <Link href="/predictions" className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-300 hover:border-purple-400 hover:text-purple-200">
        🤖 ML Predictions
      </Link>
    </nav>
  );
}
