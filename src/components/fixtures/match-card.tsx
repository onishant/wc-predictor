'use client';

import { TeamBadge } from '@/components/fixtures/team-badge';
import type { TeamVisual } from '@/lib/team-visuals';

type MatchCardProps = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamVisual?: TeamVisual;
  awayTeamVisual?: TeamVisual;
  kickoffUtc: string;
  stage?: string;
  group?: string;
  status?: string;
  predictedResult?: 'home' | 'away' | 'draw' | null;
  predictedHomeScore?: number | null;
  predictedAwayScore?: number | null;
  onClick?: () => void;
};

type MatchState = 'unpredicted' | 'predicted' | 'locked';

function getMatchState(
  kickoffUtc: string,
  predictedResult: string | null | undefined,
): MatchState {
  if (new Date() >= new Date(kickoffUtc)) return 'locked';
  if (predictedResult) return 'predicted';
  return 'unpredicted';
}

const stateStyles: Record<MatchState, { card: string; badge: string; label: string }> = {
  unpredicted: {
    card: 'border-cyan-500/30 bg-gradient-to-br from-surface/80 to-accent-muted hover:border-cyan-400/50 hover:shadow-cyan-500/8',
    badge: 'bg-cyan-400 text-slate-950',
    label: 'Tap to predict',
  },
  predicted: {
    card: 'border-emerald-500/20 bg-surface/60 hover:border-emerald-400/40',
    badge: 'bg-emerald-500/20 text-emerald-300',
    label: 'Predicted',
  },
  locked: {
    card: 'border-border-subtle/40 bg-surface/30 opacity-60',
    badge: 'bg-surface-raised text-faint',
    label: 'Locked',
  },
};

const resultLabels: Record<string, string> = {
  home: 'Home win',
  draw: 'Draw',
  away: 'Away win',
};

export function MatchCard({
  homeTeam,
  awayTeam,
  homeTeamVisual,
  awayTeamVisual,
  kickoffUtc,
  stage,
  group,
  status,
  predictedResult,
  predictedHomeScore,
  predictedAwayScore,
  onClick,
}: MatchCardProps) {
  const state = getMatchState(kickoffUtc, predictedResult ?? null);
  const styles = stateStyles[state];
  const kickoff = new Date(kickoffUtc);
  const kickoffDisplay = kickoff.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeDisplay = kickoff.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      type="button"
      onClick={state === 'locked' ? undefined : onClick}
      disabled={state === 'locked'}
      className={`group w-full rounded-2xl border p-4 text-left transition-all duration-200 ${styles.card} ${
        state === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      {/* Header: stage + kickoff */}
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span className="uppercase tracking-[0.14em]">
          {stage ?? 'Stage TBD'}{group ? ` · ${group}` : ''}
        </span>
        <span className="tabular-nums">
          {kickoffDisplay} · {timeDisplay}
        </span>
      </div>

      {/* Teams */}
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamBadge team={homeTeamVisual ?? { name: homeTeam }} size="sm" />
          <span className="truncate text-sm font-medium text-heading">{homeTeam}</span>
        </div>

        <div className="flex flex-col items-center px-2">
          {state === 'predicted' && predictedHomeScore != null && predictedAwayScore != null ? (
            <span className="text-lg font-bold tabular-nums text-heading">
              {predictedHomeScore} – {predictedAwayScore}
            </span>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-faint">vs</span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-sm font-medium text-heading">{awayTeam}</span>
          <TeamBadge team={awayTeamVisual ?? { name: awayTeam }} size="sm" />
        </div>
      </div>

      {/* Footer: state badge */}
      <div className="mt-3 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles.badge}`}>
          {state === 'predicted' && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {state === 'predicted' && predictedResult
            ? resultLabels[predictedResult] ?? 'Predicted'
            : styles.label}
        </span>

        {state !== 'locked' && (
          <span className="text-xs text-faint transition group-hover:text-body">
            {state === 'predicted' ? 'Edit' : 'Predict'} →
          </span>
        )}
      </div>

      {status && status !== 'TIMED' && status !== 'SCHEDULED' && (
        <p className="mt-2 text-xs text-amber-300/80">{status}</p>
      )}
    </button>
  );
}
