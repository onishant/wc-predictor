import Link from 'next/link';
import { AppNav } from '@/components/app-nav';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { FormStrip } from '@/components/teams/form-strip';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';
import { getWorldCupData, getWorldCupTeamProfiles } from '@/lib/world-cup-data';

export const revalidate = 300;

export default async function TeamsPage() {
  const [profiles, worldCup] = await Promise.all([
    getWorldCupTeamProfiles(),
    getWorldCupData(),
  ]);
  const statsByTeam = new Map(worldCup.teamStats.map((stats) => [stats.teamId, stats]));

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup teams</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Team stats, form, and squads</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-body">
            Form and tournament totals update automatically when World Cup matches finish. Open a team to view its coach and full player squad.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {profiles.map((team) => {
            const stats = statsByTeam.get(team.id);
            return (
              <Link key={team.id} href={`/teams/${team.id}`} className="group rounded-2xl border border-border-subtle bg-surface/70 p-5 transition hover:border-cyan-700 hover:bg-surface">
                <TeamBadge
                  team={{
                    name: team.name,
                    code: team.code,
                    crestUrl: team.crestUrl,
                    logoUrl: team.crestUrl,
                    flagUrl: getFlagUrlForTeamCode(team.code),
                  }}
                />
                <p className="mt-3 text-xs text-muted">{team.coachName ? `Coach: ${team.coachName}` : 'Coach not listed'} · {team.squad.length} players</p>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
                  <Stat label="P" value={stats?.played ?? 0} />
                  <Stat label="W" value={stats?.won ?? 0} />
                  <Stat label="GD" value={stats?.goalDifference ?? 0} />
                  <Stat label="Pts" value={stats?.points ?? 0} />
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-faint">World Cup form</p>
                  <FormStrip form={stats?.recentForm ?? []} />
                </div>
                <p className="mt-3 text-xs font-semibold text-cyan-400 transition group-hover:text-cyan-300">Tap to explore →</p>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-lg bg-background px-2 py-2">
      <span className="block text-faint">{label}</span>
      <span className="mt-1 block font-semibold text-heading">{value}</span>
    </span>
  );
}
