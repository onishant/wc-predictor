import type { WorldCupMatchSummary } from '@/lib/football-data';

export type HeadToHeadStats = {
  totalMatches: number;
  homeWins: number;
  awayWins: number;
  draws: number;
  homeGoals: number;
  awayGoals: number;
  lastResults: Array<{
    date: string;
    homeTeam: string;
    awayTeam: string;
    homeScore: number;
    awayScore: number;
    stage?: string;
  }>;
};

export type TeamFormEntry = {
  opponent: string;
  result: 'W' | 'D' | 'L';
  goalsFor: number;
  goalsAgainst: number;
  date: string;
};

export type TeamStatsSummary = {
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  recentForm: TeamFormEntry[];
  cleanSheets: number;
  avgGoalsScored: number;
  avgGoalsConceded: number;
};

/**
 * Computes head-to-head stats between two teams from all finished matches.
 */
export function computeHeadToHead(
  matches: WorldCupMatchSummary[],
  homeTeamId: number | null,
  awayTeamId: number | null,
): HeadToHeadStats {
  const h2h: HeadToHeadStats = {
    totalMatches: 0,
    homeWins: 0,
    awayWins: 0,
    draws: 0,
    homeGoals: 0,
    awayGoals: 0,
    lastResults: [],
  };

  if (!homeTeamId || !awayTeamId) return h2h;

  const relevant = matches.filter((m) => {
    if (m.status !== 'FINISHED') return false;
    const ids = [m.homeTeamId, m.awayTeamId];
    return ids.includes(homeTeamId) && ids.includes(awayTeamId);
  });

  for (const match of relevant) {
    if (match.homeScore == null || match.awayScore == null) continue;

    const isHomeTeamHome = match.homeTeamId === homeTeamId;
    const homeGoals = isHomeTeamHome ? match.homeScore : match.awayScore;
    const awayGoals = isHomeTeamHome ? match.awayScore : match.homeScore;

    h2h.totalMatches++;
    h2h.homeGoals += homeGoals;
    h2h.awayGoals += awayGoals;

    if (homeGoals > awayGoals) h2h.homeWins++;
    else if (awayGoals > homeGoals) h2h.awayWins++;
    else h2h.draws++;

    h2h.lastResults.push({
      date: match.utcDate,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      stage: match.stage,
    });
  }

  h2h.lastResults.sort((a, b) => b.date.localeCompare(a.date));
  h2h.lastResults = h2h.lastResults.slice(0, 5);

  return h2h;
}

/**
 * Computes detailed team stats from all finished matches involving this team.
 */
export function computeTeamStats(
  matches: WorldCupMatchSummary[],
  teamId: number | null,
  teamName: string,
): TeamStatsSummary {
  const stats: TeamStatsSummary = {
    teamName,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
    recentForm: [],
    cleanSheets: 0,
    avgGoalsScored: 0,
    avgGoalsConceded: 0,
  };

  if (!teamId) return stats;

  const finished = matches
    .filter((m) => m.status === 'FINISHED' && (m.homeTeamId === teamId || m.awayTeamId === teamId))
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate));

  for (const match of finished) {
    if (match.homeScore == null || match.awayScore == null) continue;

    const isHome = match.homeTeamId === teamId;
    const goalsFor = isHome ? match.homeScore : match.awayScore;
    const goalsAgainst = isHome ? match.awayScore : match.homeScore;
    const opponent = isHome ? match.awayTeam : match.homeTeam;

    stats.played++;
    stats.goalsFor += goalsFor;
    stats.goalsAgainst += goalsAgainst;

    if (goalsAgainst === 0) stats.cleanSheets++;

    let result: 'W' | 'D' | 'L';
    if (goalsFor > goalsAgainst) {
      stats.won++;
      stats.points += 3;
      result = 'W';
    } else if (goalsFor < goalsAgainst) {
      stats.lost++;
      result = 'L';
    } else {
      stats.drawn++;
      stats.points += 1;
      result = 'D';
    }

    stats.recentForm.push({
      opponent,
      result,
      goalsFor,
      goalsAgainst,
      date: match.utcDate,
    });
  }

  stats.goalDifference = stats.goalsFor - stats.goalsAgainst;
  stats.recentForm = stats.recentForm.slice(0, 5);
  stats.avgGoalsScored = stats.played > 0 ? Math.round((stats.goalsFor / stats.played) * 10) / 10 : 0;
  stats.avgGoalsConceded = stats.played > 0 ? Math.round((stats.goalsAgainst / stats.played) * 10) / 10 : 0;

  return stats;
}
