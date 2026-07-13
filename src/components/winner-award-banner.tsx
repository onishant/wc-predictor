import Link from 'next/link';
import { winnerAwardNote } from '@/lib/winner-award-note';

type WinnerAwardBannerProps = {
  compact?: boolean;
};

export function WinnerAwardBanner({ compact = false }: WinnerAwardBannerProps) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-[linear-gradient(135deg,rgba(245,158,11,0.16),rgba(34,211,238,0.12))] p-5 shadow-xl shadow-amber-950/10">
      <div className="absolute inset-y-0 right-0 w-40 bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.22),transparent_70%)]" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-200">
            {winnerAwardNote.eyebrow}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-heading sm:text-2xl">
            {winnerAwardNote.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-body">
            {winnerAwardNote.messagePrefix}{' '}
            <a
              href={winnerAwardNote.prizeUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-amber-200 underline decoration-amber-300/60 underline-offset-4 transition hover:text-amber-100"
            >
              {winnerAwardNote.prizeName}
            </a>
            .
          </p>
          <p className="mt-2 text-xs font-medium text-amber-100/85">
            {winnerAwardNote.footnote}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <a
            href={winnerAwardNote.prizeUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-amber-300/40 px-4 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-200/10"
          >
            View prize
          </a>
          {!compact && (
            <>
            <Link
              href="/leaderboard"
              className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-200"
            >
              View overall table
            </Link>
            <Link
              href="/rules"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-heading transition hover:bg-white/10"
            >
              Scoring rules
            </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
