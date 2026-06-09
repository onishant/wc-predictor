'use client';

import { useMemo } from 'react';
import { computeHeadToHead, computeTeamStats, type HeadToHeadStats, type TeamStatsSummary } from '@/lib/match-stats';
import type { WorldCupMatchSummary } from '@/lib/football-data';

type Props = {
  matches: WorldCupMatchSummary[];
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string;
  awayTeamName: string;
};

const formColor: Record<string, string> = {
  W: 'bg-emerald-500 text-slate-950',
  D: 'bg-amber-500 text-slate-950',
  L: 'bg-red-500 text-slate-950',
};

export function MatchStats({ matches, homeTeamId, awayTeamId, homeTeamName, awayTeamName }: Props) {
  const h2h = useMemo(
    () => computeHeadToHead(matches, homeTeamId, awayTeamId),
    [matches, homeTeamId, awayTeamId],
  );

  const homeStats = useMemo(
    () => computeTeamStats(matches, homeTeamId, homeTeamName),
    [matches, homeTeamId, homeTeamName],
  );

  const awayStats = useMemo(
    () => computeTeamStats(matches, awayTeamId, awayTeamName),
    [matches, awayTeamId, awayTeamName],
  );

  return (
    <div className="space-y-4">
      {/* Quick comparison bar */}
      <ComparisonBar homeTeam={homeTeamName} awayTeam={awayTeamName} homeStats={homeStats} awayStats={awayStats} />

      {/* Head to head */}
      <H2HSection h2h={h2h} homeTeam={homeTeamName} awayTeam={awayTeamName} />

      {/* Team form cards */}
      <div className="grid grid-cols-2 gap-3">
        <TeamFormCard teamName={homeTeamName} stats={homeStats} label="Home" />
        <TeamFormCard teamName={awayTeamName} stats={awayStats} label="Away" />
      </div>
    </div>
  );
}

function ComparisonBar({
  homeTeam,
  awayTeam,
  homeStats,
  awayStats,
}: {
  homeTeam: string;
  awayTeam: string;
  homeStats: TeamStatsSummary;
  awayStats: TeamStatsSummary;
}) {
  const metrics = [
    { label: 'Played', home: homeStats.played, away: awayStats.played },
    { label: 'Won', home: homeStats.won, away: awayStats.won },
    { label: 'Goals', home: homeStats.goalsFor, away: awayStats.goalsFor },
    { label: 'Avg Goals', home: homeStats.avgGoalsScored, away: awayStats.avgGoalsScored },
    { label: 'Clean Sheets', home: homeStats.cleanSheets, away: awayStats.cleanSheets },
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-surface/60 p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold text-body">
        <span>{homeTeam}</span>
        <span>{awayTeam}</span>
      </div>
      <div className="space-y-2">
        {metrics.map((metric) => {
          const total = metric.home + metric.away;
          const homePct = total > 0 ? (metric.home / total) * 100 : 50;
          return (
            <div key={metric.label}>
              <div className="mb-0.5 flex items-center justify-between text-[11px] text-muted">
                <span className="w-8 text-right tabular-nums">{metric.home}</span>
                <span>{metric.label}</span>
                <span className="w-8 tabular-nums">{metric.away}</span>
              </div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-surface-raised">
                <div
                  className="h-full rounded-full bg-cyan-400 transition-all duration-500"
                  style={{ width: `${homePct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function H2HSection({
  h2h,
  homeTeam,
  awayTeam,
}: {
  h2h: HeadToHeadStats;
  homeTeam: string;
  awayTeam: string;
}) {
  if (h2h.totalMatches === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface/60 p-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Head to Head</p>
        <p className="mt-2 text-sm text-faint">No previous meetings found</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Head to Head</p>
      <div className="flex items-center justify-center gap-4 text-center">
        <div>
          <span className="text-2xl font-bold text-cyan-300">{h2h.homeWins}</span>
          <p className="text-[11px] text-muted">{homeTeam} wins</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-body">{h2h.draws}</span>
          <p className="text-[11px] text-muted">Draws</p>
        </div>
        <div>
          <span className="text-2xl font-bold text-cyan-300">{h2h.awayWins}</span>
          <p className="text-[11px] text-muted">{awayTeam} wins</p>
        </div>
      </div>
      {h2h.lastResults.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] text-faint">Recent meetings:</p>
          {h2h.lastResults.map((result, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-background/50 px-2.5 py-1.5 text-xs">
              <span className="text-muted">{new Date(result.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              <span className="font-medium text-heading">
                {result.homeTeam} {result.homeScore} – {result.awayScore} {result.awayTeam}
              </span>
              {result.stage && <span className="text-faint">{result.stage}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamFormCard({
  teamName,
  stats,
  label,
}: {
  teamName: string;
  stats: TeamStatsSummary;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface/60 p-3">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{label}</p>
      <p className="mb-2 text-sm font-semibold text-heading">{teamName}</p>

      {/* Record */}
      <div className="mb-2 flex gap-2 text-xs">
        <span className="text-emerald-300">{stats.won}W</span>
        <span className="text-amber-300">{stats.drawn}D</span>
        <span className="text-red-300">{stats.lost}L</span>
      </div>

      {/* Form dots */}
      {stats.recentForm.length > 0 && (
        <div className="mb-2 flex gap-1">
          {stats.recentForm.map((entry, i) => (
            <span
              key={i}
              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${formColor[entry.result]}`}
              title={`${entry.result} vs ${entry.opponent} (${entry.goalsFor}–${entry.goalsAgainst})`}
            >
              {entry.result}
            </span>
          ))}
        </div>
      )}

      {/* Mini stats */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded bg-background/50 px-2 py-1">
          <span className="text-faint">GF</span>{' '}
          <span className="font-semibold text-heading">{stats.goalsFor}</span>
        </div>
        <div className="rounded bg-background/50 px-2 py-1">
          <span className="text-faint">GA</span>{' '}
          <span className="font-semibold text-heading">{stats.goalsAgainst}</span>
        </div>
        <div className="rounded bg-background/50 px-2 py-1">
          <span className="text-faint">GD</span>{' '}
          <span className={`font-semibold ${stats.goalDifference > 0 ? 'text-emerald-300' : stats.goalDifference < 0 ? 'text-red-300' : 'text-heading'}`}>
            {stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}
          </span>
        </div>
        <div className="rounded bg-background/50 px-2 py-1">
          <span className="text-faint">CS</span>{' '}
          <span className="font-semibold text-heading">{stats.cleanSheets}</span>
        </div>
      </div>
    </div>
  );
}
