'use client';

import { useMemo, useState } from 'react';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { PredictionPanel } from '@/components/fixtures/prediction-panel';
import type { WorldCupMatchSummary, TeamWorldCupStats } from '@/lib/football-data';

type Props = {
  matches: WorldCupMatchSummary[];
  userId: string;
  teamStats?: TeamWorldCupStats[];
  predictions?: Record<string, {
    predicted_result: 'home' | 'away' | 'draw';
    pred_home_score: number;
    pred_away_score: number;
  }>;
  onSaved?: () => void;
};

type MatchGroup = {
  dateKey: string;
  dateLabel: string;
  dayLabel: string;
  monthLabel: string;
  matchday: string;
  matches: WorldCupMatchSummary[];
};

function groupMatchesByDate(matches: WorldCupMatchSummary[]): MatchGroup[] {
  const groups = new Map<string, WorldCupMatchSummary[]>();

  for (const match of matches) {
    const date = new Date(match.utcDate);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const existing = groups.get(key) ?? [];
    existing.push(match);
    groups.set(key, existing);
  }

  const sorted = Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));

  return sorted.map(([dateKey, dateMatches], index) => {
    const date = new Date(dateKey + 'T12:00:00Z');
    return {
      dateKey,
      dateLabel: date.toLocaleDateString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      dayLabel: date.toLocaleDateString('en-GB', {
        day: 'numeric',
      }),
      monthLabel: date.toLocaleDateString('en-GB', {
        month: 'short',
      }),
      matchday: `Matchday ${index + 1}`,
      matches: dateMatches.sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    };
  });
}

const statusColors: Record<string, string> = {
  FINISHED: 'bg-emerald-500/20 text-emerald-300',
  IN_PLAY: 'bg-amber-500/20 text-amber-300',
  PAUSED: 'bg-amber-500/20 text-amber-300',
  TIMED: 'bg-surface-raised/40 text-muted',
  SCHEDULED: 'bg-surface-raised/40 text-muted',
  POSTPONED: 'bg-red-500/20 text-red-300',
  CANCELLED: 'bg-red-500/20 text-red-300',
};

export function FixturesByDate({ matches, userId, teamStats = [], predictions = {}, onSaved }: Props) {
  const [predictionMatchId, setPredictionMatchId] = useState<string | null>(null);

  const groups = useMemo(() => groupMatchesByDate(matches), [matches]);

  const predictionMatch = useMemo(
    () => matches.find((m) => String(m.id) === predictionMatchId) ?? null,
    [matches, predictionMatchId],
  );

  const totalPredicted = Object.keys(predictions).length;
  const totalMatches = matches.length;

  return (
    <>
      {/* Progress bar */}
      <div className="mb-6 rounded-2xl border border-border-subtle bg-surface/60 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-body">Your predictions</span>
          <span className="font-semibold text-cyan-300">{totalPredicted} / {totalMatches}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-300 transition-all duration-500"
            style={{ width: `${totalMatches > 0 ? (totalPredicted / totalMatches) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gradient-to-b from-cyan-500/40 via-border-default/40 to-transparent" />

        {groups.map((group, groupIndex) => (
          <div key={group.dateKey} className="relative pb-8 last:pb-0">
            {/* Date marker */}
            <div className="relative flex items-start gap-4">
              {/* Timeline dot */}
              <div className="relative z-10 flex flex-col items-center">
                <div className={`flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 text-center ${
                  groupIndex === 0
                    ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300'
                    : 'border-border-default bg-surface text-muted'
                }`}>
                  <span className="text-base font-bold leading-none">{group.dayLabel}</span>
                  <span className="text-[10px] font-semibold uppercase leading-none mt-0.5">{group.monthLabel}</span>
                </div>
              </div>

              {/* Date content */}
              <div className="min-w-0 flex-1 pt-1">
                {/* Date header */}
                <div className="mb-3 flex items-baseline gap-3">
                  <h3 className="text-lg font-semibold text-heading">{group.dateLabel}</h3>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-faint">{group.matchday}</span>
                </div>

                {/* Match cards for this date */}
                <div className="space-y-2">
                  {group.matches.map((match) => {
                    const pred = predictions[String(match.id)];
                    const isLocked = new Date() >= new Date(match.utcDate);
                    const hasPrediction = !!pred;
                    const time = new Date(match.utcDate).toLocaleTimeString('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    const statusColor = statusColors[match.status ?? ''] ?? statusColors.SCHEDULED;

                    return (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => !isLocked && setPredictionMatchId(String(match.id))}
                        disabled={isLocked}
                        className={`group w-full rounded-xl border p-3 text-left transition-all duration-200 ${
                          isLocked
                            ? 'cursor-not-allowed border-border-subtle/40 bg-surface/20 opacity-60'
                            : hasPrediction
                            ? 'border-emerald-500/20 bg-surface/50 hover:border-emerald-400/40'
                            : 'border-border-subtle/60 bg-surface/40 hover:border-cyan-400/40 hover:bg-surface/70'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Time */}
                          <div className="flex w-12 flex-shrink-0 flex-col items-center">
                            <span className="text-sm font-semibold tabular-nums text-heading">{time}</span>
                            {(match.status === 'IN_PLAY' || match.status === 'PAUSED') ? (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-400">
                                <span className="h-1 w-1 animate-pulse rounded-full bg-red-400" />
                                Live
                              </span>
                            ) : (
                              <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                                {match.status === 'TIMED' || match.status === 'SCHEDULED' ? 'Upcoming' : match.status}
                              </span>
                            )}
                          </div>

                          {/* Teams */}
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <TeamBadge team={match.homeTeamVisual} size="sm" />
                            </div>

                            <div className="flex flex-col items-center px-2">
                              {hasPrediction ? (
                                <span className="text-base font-bold tabular-nums text-heading">
                                  {pred!.pred_home_score} – {pred!.pred_away_score}
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-faint">vs</span>
                              )}
                            </div>

                            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                              <TeamBadge team={match.awayTeamVisual} size="sm" />
                            </div>
                          </div>

                          {/* Prediction status */}
                          <div className="flex w-20 flex-shrink-0 justify-end">
                            {hasPrediction ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Done
                              </span>
                            ) : isLocked ? (
                              <span className="text-[11px] text-faint">Locked</span>
                            ) : (
                              <span className="text-[11px] text-muted transition group-hover:text-cyan-300">Predict →</span>
                            )}
                          </div>
                        </div>

                        {/* Stage info */}
                        <div className="mt-1.5 pl-14 text-[11px] text-faint">
                          {match.stage ?? 'Stage TBD'}{match.group ? ` · ${match.group}` : ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prediction slide-over */}
      {predictionMatch && (
        <PredictionPanel
          matchId={String(predictionMatch.id)}
          homeTeam={predictionMatch.homeTeam}
          awayTeam={predictionMatch.awayTeam}
          homeTeamVisual={predictionMatch.homeTeamVisual}
          awayTeamVisual={predictionMatch.awayTeamVisual}
          kickoffUtc={predictionMatch.utcDate}
          userId={userId}
          group={predictionMatch.group}
          homeTeamStats={teamStats.find((s) => s.teamName === predictionMatch.homeTeam) ?? null}
          awayTeamStats={teamStats.find((s) => s.teamName === predictionMatch.awayTeam) ?? null}
          allTeamStats={teamStats}
          initialHomeScore={predictions[String(predictionMatch.id)]?.pred_home_score ?? null}
          initialAwayScore={predictions[String(predictionMatch.id)]?.pred_away_score ?? null}
          onClose={() => setPredictionMatchId(null)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}
