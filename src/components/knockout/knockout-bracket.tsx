'use client';

import Image from 'next/image';
import type { MatchRow, TeamRow } from '@/lib/types';

type MatchWithTeams = MatchRow & {
  homeTeam: TeamRow | null;
  awayTeam: TeamRow | null;
  minute?: number | null;
  injury_time?: number | null;
};

type Props = {
  matches: MatchWithTeams[];
};

const ROUND_ORDER = [
  'Round Of 32',
  'Round Of 16',
  'Quarter Finals',
  'Semi Finals',
  'Third Place',
  'Final',
];

function normalizeRound(stage: string | null): string {
  if (!stage) return 'Knockout';
  const value = stage.replaceAll('_', ' ').toLowerCase();
  if (value.includes('32')) return 'Round Of 32';
  if (value.includes('16')) return 'Round Of 16';
  if (value.includes('quarter')) return 'Quarter Finals';
  if (value.includes('semi')) return 'Semi Finals';
  if (value.includes('third')) return 'Third Place';
  if (value.includes('final')) return 'Final';
  return stage
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupByRound(matches: MatchWithTeams[]): Map<string, MatchWithTeams[]> {
  const grouped = new Map<string, MatchWithTeams[]>();
  for (const match of matches) {
    const round = normalizeRound(match.stage);
    const arr = grouped.get(round) ?? [];
    arr.push(match);
    grouped.set(round, arr);
  }
  return grouped;
}

function getStatusDisplay(match: MatchWithTeams): { label: string; live: boolean } {
  if (match.status === 'in_play') {
    const minute = match.minute != null ? `${match.minute}'` : '';
    return { label: minute || 'Live', live: true };
  }
  if (match.status === 'finished') return { label: 'FT', live: false };
  if (match.kickoff_utc) {
    const d = new Date(match.kickoff_utc);
    return {
      label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      live: false,
    };
  }
  return { label: 'TBD', live: false };
}

function TeamDisplay({ team, score, isWinner }: { team: TeamRow | null; score: number | null; isWinner: boolean }) {
  const name = team?.name ?? 'TBD';
  const crest = team?.crest_url ?? team?.logo_url ?? null;

  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isWinner ? 'bg-emerald-500/10' : ''}`}>
      <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-border-default bg-background">
        {crest ? (
          <Image src={crest} alt="" fill className="object-contain p-0.5" sizes="24px" unoptimized />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-faint">
            {team?.code ?? '??'}
          </span>
        )}
      </div>
      <span className={`flex-1 truncate text-sm ${isWinner ? 'font-bold text-heading' : team ? 'text-body' : 'text-faint italic'}`}>
        {name}
      </span>
      {score != null && (
        <span className={`tabular-nums text-sm font-bold ${isWinner ? 'text-emerald-300' : 'text-muted'}`}>
          {score}
        </span>
      )}
    </div>
  );
}

function KnockoutMatch({ match }: { match: MatchWithTeams }) {
  const status = getStatusDisplay(match);
  const homeWin = match.status === 'finished' && match.home_score != null && match.away_score != null && match.home_score > match.away_score;
  const awayWin = match.status === 'finished' && match.home_score != null && match.away_score != null && match.away_score > match.home_score;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface/60 p-1 shadow-lg transition hover:border-accent/30 hover:shadow-accent/5">
      <TeamDisplay team={match.homeTeam} score={match.home_score} isWinner={homeWin ?? false} />
      <div className="border-t border-border-subtle" />
      <TeamDisplay team={match.awayTeam} score={match.away_score} isWinner={awayWin ?? false} />
      <div className="flex items-center justify-center border-t border-border-subtle px-3 py-1.5">
        {status.live ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {status.label}
          </span>
        ) : (
          <span className="text-[11px] font-medium uppercase tracking-wider text-faint">{status.label}</span>
        )}
      </div>
    </div>
  );
}

export function KnockoutBracket({ matches }: Props) {
  const grouped = groupByRound(matches);
  const orderedRounds = ROUND_ORDER.filter((r) => grouped.has(r));
  // Add any rounds not in ROUND_ORDER at the end
  for (const round of grouped.keys()) {
    if (!orderedRounds.includes(round)) orderedRounds.push(round);
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-6" style={{ minWidth: `${orderedRounds.length * 260}px` }}>
        {orderedRounds.map((round) => {
          const roundMatches = grouped.get(round) ?? [];
          return (
            <div key={round} className="flex w-[240px] shrink-0 flex-col gap-4">
              <h2 className="sticky top-0 z-10 rounded-lg bg-cyan-500/10 px-3 py-2 text-center text-xs font-bold uppercase tracking-[0.16em] text-cyan-300 backdrop-blur">
                {round}
              </h2>
              <div className="flex flex-col gap-3">
                {roundMatches.map((match) => (
                  <KnockoutMatch key={match.id} match={match} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
