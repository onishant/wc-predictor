import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';
import { getWorldCupData, getWorldCupTeamProfiles } from '@/lib/world-cup-data';
import type { TeamWorldCupStats } from '@/lib/football-data';

export const revalidate = 300;

type GroupStanding = {
  group: string;
  label: string;
  teams: TeamWorldCupStats[];
};

// Official 2026 FIFA World Cup groups (positions 1-4 per group)
// Used as fallback when match data doesn't yet contain group assignments.
const WC_2026_GROUPS: Array<{ group: string; label: string; teams: string[] }> = [
  { group: 'GROUP_A', label: 'Group A', teams: ['Mexico', 'South Africa', 'South Korea', 'Czech Republic'] },
  { group: 'GROUP_B', label: 'Group B', teams: ['Canada', 'Bosnia and Herzegovina', 'Qatar', 'Switzerland'] },
  { group: 'GROUP_C', label: 'Group C', teams: ['Brazil', 'Morocco', 'Haiti', 'Scotland'] },
  { group: 'GROUP_D', label: 'Group D', teams: ['United States', 'Paraguay', 'Australia', 'Turkey'] },
  { group: 'GROUP_E', label: 'Group E', teams: ['Germany', 'Curaçao', 'Ivory Coast', 'Ecuador'] },
  { group: 'GROUP_F', label: 'Group F', teams: ['Netherlands', 'Japan', 'Sweden', 'Tunisia'] },
  { group: 'GROUP_G', label: 'Group G', teams: ['Belgium', 'Egypt', 'Iran', 'New Zealand'] },
  { group: 'GROUP_H', label: 'Group H', teams: ['Spain', 'Cape Verde', 'Saudi Arabia', 'Uruguay'] },
  { group: 'GROUP_I', label: 'Group I', teams: ['France', 'Senegal', 'Iraq', 'Norway'] },
  { group: 'GROUP_J', label: 'Group J', teams: ['Argentina', 'Algeria', 'Austria', 'Jordan'] },
  { group: 'GROUP_K', label: 'Group K', teams: ['Portugal', 'DR Congo', 'Uzbekistan', 'Colombia'] },
  { group: 'GROUP_L', label: 'Group L', teams: ['England', 'Croatia', 'Ghana', 'Panama'] },
];

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function findTeamByName(
  name: string,
  statsMap: Map<number, TeamWorldCupStats>,
  profiles: Array<{ id: number; name: string; code: string | null; crestUrl: string | null }>,
): TeamWorldCupStats | null {
  const target = normalizeName(name);

  // Try exact match in stats first
  for (const stats of statsMap.values()) {
    if (normalizeName(stats.teamName) === target) return stats;
  }

  // Try profiles (for teams with no matches yet)
  for (const p of profiles) {
    if (normalizeName(p.name) === target) {
      const existing = statsMap.get(p.id);
      if (existing) return existing;
      return {
        teamId: p.id,
        teamName: p.name,
        teamVisual: {
          name: p.name,
          code: p.code,
          crestUrl: p.crestUrl,
          logoUrl: p.crestUrl,
          flagUrl: getFlagUrlForTeamCode(p.code),
        },
        played: 0, won: 0, drawn: 0, lost: 0,
        goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
        recentForm: [],
      };
    }
  }

  return null;
}

export default async function TeamsPage() {
  const [profiles, worldCup] = await Promise.all([
    getWorldCupTeamProfiles(),
    getWorldCupData(),
  ]);

  const statsByTeam = new Map(worldCup.teamStats.map((s) => [s.teamId, s]));

  // Try to extract groups from match data first
  const teamGroups = new Map<number, string>();
  const groupLabels = new Map<string, string>();
  for (const match of worldCup.schedule) {
    if (match.stage !== 'GROUP_STAGE' || !match.group) continue;
    if (match.homeTeamId) teamGroups.set(match.homeTeamId, match.group);
    if (match.awayTeamId) teamGroups.set(match.awayTeamId, match.group);
    // Try to derive a nice label from the match data
    if (match.group && !groupLabels.has(match.group)) {
      const letter = match.group.replace('GROUP_', '');
      groupLabels.set(match.group, `Group ${letter}`);
    }
  }

  // If we have group data from matches, use it (merge with hardcoded for missing teams)
  // Otherwise, fall back entirely to the hardcoded groups
  const groups: GroupStanding[] = [];

  for (const wcGroup of WC_2026_GROUPS) {
    const groupTeams: TeamWorldCupStats[] = [];

    for (const teamName of wcGroup.teams) {
      const team = findTeamByName(teamName, statsByTeam, profiles);
      if (team) groupTeams.push(team);
    }

    // Sort: points desc, GD desc, GF desc, name asc
    groupTeams.sort((a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName)
    );

    groups.push({
      group: wcGroup.group,
      label: wcGroup.label,
      teams: groupTeams,
    });
  }

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

        {/* Group tables — 2-column grid on large screens */}
        <section className="grid gap-5 lg:grid-cols-2">
          {groups.map((group) => (
            <div key={group.group} className="rounded-2xl border border-border-subtle bg-surface/70 overflow-hidden">
              <div className="border-b border-border-subtle bg-surface-overlay px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-cyan-400">{group.label}</h2>
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
                    {group.teams.map((team, idx) => (
                      <tr key={team.teamId} className="border-b border-border-subtle/50 transition hover:bg-surface-overlay">
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
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
