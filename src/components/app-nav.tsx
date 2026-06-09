import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';

export function AppNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      <Link href="/fixtures" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Fixtures
      </Link>
      <Link href="/teams" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Teams
      </Link>
      <Link href="/avatar" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Avatar
      </Link>
      <Link href="/leaderboard" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Leaderboard
      </Link>
      <Link href="/predictions" className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-300 hover:border-purple-400 hover:text-purple-200">
        🤖 ML Predictions
      </Link>
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </nav>
  );
}
