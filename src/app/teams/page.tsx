import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';
import { getWorldCupData, getWorldCupTeamProfiles } from '@/lib/world-cup-data';
import type { TeamWorldCupStats } from '@/lib/football-data';

export const revalidate = 300;

type GroupStanding = {
  group: string;
  teams: TeamWorldCupStats[];
};

const GROUP_ORDER = [
  'GROUP_A', 'GROUP_B', 'GROUP_C', 'GROUP_D',
  'GROUP_E', 'GROUP_F', 'GROUP_G', 'GROUP_H',
  'GROUP_I', 'GROUP_J', 'GROUP_K', 'GROUP_L',
];

function groupLabel(group: string): string {
  const letter = group.replace('GROUP_', '');
  return `Group ${letter}`;
}

export default async function TeamsPage() {
  const [profiles, worldCup] = await Promise.all([
    getWorldCupTeamProfiles(),
    getWorldCupData(),
  ]);

  const statsByTeam = new Map(worldCup.teamStats.map((s) => [s.teamId, s]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  // Extract group assignments from group-stage matches
  const teamGroups = new Map<number, string>();
  for (const match of worldCup.schedule) {
    if (match.stage !== 'GROUP_STAGE' || !match.group) continue;
    if (match.homeTeamId) teamGroups.set(match.homeTeamId, match.group);
    if (match.awayTeamId) teamGroups.set(match.awayTeamId, match.group);
  }

  // Build group standings
  const groups = new Map<string, GroupStanding>();

  for (const [teamId, group] of teamGroups) {
    if (!groups.has(group)) {
      groups.set(group, { group, teams: [] });
    }
    const standing = groups.get(group)!;
    const stats = statsByTeam.get(teamId);
    const profile = profileById.get(teamId);

    if (stats) {
      standing.teams.push({ ...stats });
    } else if (profile) {
      standing.teams.push({
        teamId: profile.id,
        teamName: profile.name,
        teamVisual: {
          name: profile.name,
          code: profile.code ?? null,
          crestUrl: profile.crestUrl ?? null,
          logoUrl: profile.crestUrl ?? null,
          flagUrl: getFlagUrlForTeamCode(profile.code),
        },
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        recentForm: [],
      });
    }
  }

  // Sort teams within each group: points desc, GD desc, GF desc, name asc
  for (const group of groups.values()) {
    group.teams.sort((a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName)
    );
  }

  // Sort groups by standard order
  const sortedGroups = [...groups.values()].sort((a, b) => {
    const ai = GROUP_ORDER.indexOf(a.group);
    const bi = GROUP_ORDER.indexOf(b.group);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Teams not in any group (knockout-only, TBD, etc.)
  const groupedTeamIds = new Set(teamGroups.keys());
  const ungrouped = worldCup.teamStats.filter((s) => !groupedTeamIds.has(s.teamId));

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup 2026</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Groups &amp; Standings</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-body">
            Tap any team to view its coach, squad, and full stats. Standings update automatically when matches finish.
          </p>
        </header>

        {/* Group tables */}
        <section className="grid gap-5 lg:grid-cols-2">
          {sortedGroups.map((group) => (
            <div key={group.group} className="rounded-2xl border border-border-subtle bg-surface/70 overflow-hidden">
              <div className="border-b border-border-subtle bg-surface-overlay px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{groupLabel(group.group)}</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-xs text-faint">
                      <th className="w-8 px-3 py-2 text-center">#</th>
                      <th className="px-3 py-2 text-left">Team</th>
                      <th className="w-10 px-2 py-2 text-center" title="Played">P</th>
                      <th className="w-10 px-2 py-2 text-center" title="Won">W</th>
                      <th className="w-10 px-2 py-2 text-center" title="Drawn">D</th>
                      <th className="w-10 px-2 py-2 text-center" title="Lost">L</th>
                      <th className="w-10 px-2 py-2 text-center" title="Goals for">GF</th>
                      <th className="w-10 px-2 py-2 text-center" title="Goals against">GA</th>
                      <th className="w-10 px-2 py-2 text-center" title="Goal difference">GD</th>
                      <th className="w-10 px-2 py-2 text-center font-semibold" title="Points">Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.teams.map((team, idx) => {
                      const isQualified = idx < 2; // top 2 qualify
                      return (
                        <tr key={team.teamId} className={`border-b border-border-subtle/50 transition hover:bg-surface-overlay ${isQualified ? '' : ''}`}>
                          <td className="px-3 py-2.5 text-center text-xs text-faint">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <Link href={`/teams/${team.teamId}`} className="flex items-center gap-2 hover:text-cyan-300 transition">
                              <TeamBadge team={team.teamVisual} size="sm" />
                            </Link>
                          </td>
                          <td className="px-2 py-2.5 text-center text-body">{team.played}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.won}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.drawn}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.lost}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.goalsFor}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.goalsAgainst}</td>
                          <td className="px-2 py-2.5 text-center text-body">{team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}</td>
                          <td className="px-2 py-2.5 text-center font-semibold text-heading">{team.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>

        {/* Ungrouped teams (knockout-only or TBD) */}
        {ungrouped.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-faint">Other qualified teams</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {ungrouped.map((stats) => (
                <Link key={stats.teamId} href={`/teams/${stats.teamId}`} className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface/70 p-4 transition hover:border-cyan-700 hover:bg-surface">
                  <TeamBadge team={stats.teamVisual} size="sm" />
                  <div className="ml-auto flex gap-2 text-xs text-faint">
                    <span>Pts <strong className="text-heading">{stats.points}</strong></span>
                    <span>GD <strong className="text-heading">{stats.goalDifference > 0 ? `+${stats.goalDifference}` : stats.goalDifference}</strong></span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
