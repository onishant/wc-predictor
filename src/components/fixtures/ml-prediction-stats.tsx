'use client';

import { useEffect, useState } from 'react';
import type { MatchPrediction } from '@/lib/ml-api';
import type { TeamWorldCupStats } from '@/lib/football-data';

type Props = {
  homeTeam: string;
  awayTeam: string;
  group?: string;
  homeTeamStats?: TeamWorldCupStats | null;
  awayTeamStats?: TeamWorldCupStats | null;
  allTeamStats?: TeamWorldCupStats[];
};

type MLData = {
  match: MatchPrediction | null;
  loading: boolean;
};

const formColor: Record<string, string> = {
  W: 'bg-emerald-500 text-slate-950',
  D: 'bg-amber-500 text-slate-950',
  L: 'bg-red-500 text-slate-950',
};

export function MLPredictionStats({ homeTeam, awayTeam, group, homeTeamStats, awayTeamStats, allTeamStats = [] }: Props) {
  const [data, setData] = useState<MLData>({
    match: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchML() {
      const match = await fetch(`/api/ml/match/${encodeURIComponent(homeTeam)}/${encodeURIComponent(awayTeam)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      if (mounted) {
        setData({ match, loading: false });
      }
    }

    fetchML();
    return () => {
      mounted = false;
    };
  }, [homeTeam, awayTeam]);

  if (data.loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <span className="text-xs text-slate-400">Loading ML predictions...</span>
        </div>
      </div>
    );
  }

  if (!data.match && !homeTeamStats && !awayTeamStats) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-purple-400">
        🤖 ML Predictions
      </p>

      {/* Match prediction: xG + win probabilities */}
      {data.match && <MatchPredictionCard match={data.match} homeTeam={homeTeam} awayTeam={awayTeam} />}

      {/* Current World Cup stats side by side */}
      {(homeTeamStats || awayTeamStats) && (
        <div className="grid grid-cols-2 gap-2">
          {homeTeamStats && <TeamWCCard team={homeTeam} stats={homeTeamStats} />}
          {awayTeamStats && <TeamWCCard team={awayTeam} stats={awayTeamStats} />}
        </div>
      )}

      {/* Group standings */}
      {group && allTeamStats.length > 0 && (
        <GroupStandings group={group} allTeamStats={allTeamStats} homeTeam={homeTeam} awayTeam={awayTeam} />
      )}
    </div>
  );
}

function MatchPredictionCard({
  match,
  homeTeam,
  awayTeam,
}: {
  match: MatchPrediction;
  homeTeam: string;
  awayTeam: string;
}) {
  const homeWin = Math.round(match.home_win * 100);
  const draw = Math.round(match.draw * 100);
  const awayWin = Math.round(match.away_win * 100);

  return (
    <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3">
      <p className="mb-2 text-xs text-slate-400">Expected Goals & Outcome</p>

      {/* xG display */}
      <div className="mb-3 flex items-center justify-center gap-6">
        <div className="text-center">
          <span className="text-2xl font-bold text-slate-100">{match.expected_home_goals.toFixed(1)}</span>
          <p className="text-[11px] text-slate-400">{homeTeam} xG</p>
        </div>
        <span className="text-lg text-slate-500">vs</span>
        <div className="text-center">
          <span className="text-2xl font-bold text-slate-100">{match.expected_away_goals.toFixed(1)}</span>
          <p className="text-[11px] text-slate-400">{awayTeam} xG</p>
        </div>
      </div>

      {/* Win probability bar */}
      <div className="mb-1.5 flex h-3 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-cyan-400 transition-all"
          style={{ width: `${homeWin}%` }}
          title={`${homeTeam} ${homeWin}%`}
        />
        <div
          className="h-full bg-slate-500 transition-all"
          style={{ width: `${draw}%` }}
          title={`Draw ${draw}%`}
        />
        <div
          className="h-full bg-amber-400 transition-all"
          style={{ width: `${awayWin}%` }}
          title={`${awayTeam} ${awayWin}%`}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-400">
        <span>{homeTeam} {homeWin}%</span>
        <span>Draw {draw}%</span>
        <span>{awayTeam} {awayWin}%</span>
      </div>
    </div>
  );
}

function TeamWCCard({ team, stats }: { team: string; stats: TeamWorldCupStats }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="mb-1 text-xs font-semibold text-slate-200">{team}</p>
      <p className="mb-2 text-[11px] text-slate-500">Current World Cup</p>

      {/* Record */}
      <div className="mb-2 flex gap-2 text-xs">
        <span className="text-emerald-300">{stats.won}W</span>
        <span className="text-amber-300">{stats.drawn}D</span>
        <span className="text-red-300">{stats.lost}L</span>
      </div>

      {/* Form dots */}
      {stats.recentForm.length > 0 && (
        <div className="mb-2 flex gap-1">
          {stats.recentForm.map((result, i) => (
            <span
              key={i}
              className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${formColor[result]}`}
            >
              {result}
            </span>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        <div className="rounded bg-slate-950/50 px-2 py-1">
          <span className="text-slate-500">P</span>{' '}
          <span className="font-semibold text-slate-200">{stats.played}</span>
        </div>
        <div className="rounded bg-slate-950/50 px-2 py-1">
          <span className="text-slate-500">GF</span>{' '}
          <span className="font-semibold text-slate-200">{stats.goalsFor}</span>
        </div>
        <div className="rounded bg-slate-950/50 px-2 py-1">
          <span className="text-slate-500">GA</span>{' '}
          <span className="font-semibold text-slate-200">{stats.goalsAgainst}</span>
        </div>
        <div className="col-span-2 rounded bg-slate-950/50 px-2 py-1">
          <span className="text-slate-500">GD</span>{' '}
          <span className={`font-semibold ${stats.goalDifference > 0 ? 'text-emerald-300' : stats.goalDifference < 0 ? 'text-red-300' : 'text-slate-200'}`}>
            {stats.goalDifference > 0 ? '+' : ''}{stats.goalDifference}
          </span>
        </div>
      </div>
    </div>
  );
}

function GroupStandings({
  group,
  allTeamStats,
  homeTeam,
  awayTeam,
}: {
  group: string;
  allTeamStats: TeamWorldCupStats[];
  homeTeam: string;
  awayTeam: string;
}) {
  // Filter teams in this group and sort by points, then GD, then GF
  const groupTeams = allTeamStats
    .filter((t) => t.teamName === homeTeam || t.teamName === awayTeam || t.played > 0)
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor)
    .slice(0, 4);

  if (groupTeams.length === 0) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{group} Standings</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[11px] text-slate-500">
            <th className="pb-1.5 text-left font-medium">Team</th>
            <th className="pb-1.5 text-right font-medium">P</th>
            <th className="pb-1.5 text-right font-medium">W</th>
            <th className="pb-1.5 text-right font-medium">D</th>
            <th className="pb-1.5 text-right font-medium">L</th>
            <th className="pb-1.5 text-right font-medium">GD</th>
            <th className="pb-1.5 text-right font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {groupTeams.map((team) => {
            const isMatch = team.teamName === homeTeam || team.teamName === awayTeam;
            return (
              <tr
                key={team.teamId}
                className={`border-t border-slate-800/50 ${isMatch ? 'bg-cyan-500/8' : ''}`}
              >
                <td className={`py-1.5 text-left font-medium ${isMatch ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {team.teamName}
                </td>
                <td className="py-1.5 text-right tabular-nums text-slate-300">{team.played}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-300">{team.won}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-300">{team.drawn}</td>
                <td className="py-1.5 text-right tabular-nums text-slate-300">{team.lost}</td>
                <td className={`py-1.5 text-right tabular-nums ${
                  team.goalDifference > 0 ? 'text-emerald-300' : team.goalDifference < 0 ? 'text-red-300' : 'text-slate-300'
                }`}>
                  {team.goalDifference > 0 ? '+' : ''}{team.goalDifference}
                </td>
                <td className="py-1.5 text-right font-semibold tabular-nums text-slate-100">{team.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
