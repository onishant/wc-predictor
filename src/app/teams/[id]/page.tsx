import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppNav } from '@/components/app-nav';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { FormStrip } from '@/components/teams/form-strip';
import { ProjectedLineupView } from '@/components/teams/projected-lineup';
import { getWorldCupScheduleAndStats, getWorldCupTeamProfiles } from '@/lib/football-data';
import { projectStartingEleven } from '@/lib/team-lineup';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';
import { getWorldCupTrivia } from '@/lib/world-cup-trivia';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TeamPage({ params }: Props) {
  const { id } = await params;
  const [profiles, worldCup] = await Promise.all([
    getWorldCupTeamProfiles(),
    getWorldCupScheduleAndStats(),
  ]);
  const team = profiles.find((profile) => String(profile.id) === id);
  if (!team) notFound();

  const stats = worldCup.teamStats.find((row) => row.teamId === team.id);
  const positions = countPositions(team.squad);
  const lineup = projectStartingEleven(team.squad);
  const trivia = getWorldCupTrivia(team.code);
  const ages = team.squad.map((player) => getAge(player.dateOfBirth)).filter((age): age is number => age !== null);
  const averageAge = ages.length ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : '—';
  const visual = {
    name: team.name,
    code: team.code,
    crestUrl: team.crestUrl,
    logoUrl: team.crestUrl,
    flagUrl: getFlagUrlForTeamCode(team.code),
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <AppNav />
        <Link href="/teams" className="text-sm text-cyan-300 hover:text-cyan-200">← All teams</Link>

        <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6">
          <TeamBadge team={visual} />
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            <span>Coach: <strong className="text-slate-100">{team.coachName ?? 'Not listed'}</strong></span>
            <span>Squad: <strong className="text-slate-100">{team.squad.length}</strong></span>
            <span>Average age: <strong className="text-slate-100">{averageAge}</strong></span>
            {team.website && <a href={team.website} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noreferrer">Official website</a>}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Played" value={stats?.played ?? 0} />
          <Stat label="Won" value={stats?.won ?? 0} />
          <Stat label="Drawn" value={stats?.drawn ?? 0} />
          <Stat label="Lost" value={stats?.lost ?? 0} />
          <Stat label="Goal difference" value={stats?.goalDifference ?? 0} />
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="font-semibold">Recent World Cup form</h2>
          <div className="mt-3"><FormStrip form={stats?.recentForm ?? []} /></div>
          <p className="mt-3 text-xs text-slate-500">The current data provider does not include international friendlies, qualifiers, or player match ratings.</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <div>
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-400">4-3-3 projection</p>
              <h2 className="mt-1 text-xl font-semibold">Predicted starting eleven</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">Projection based on listed position and an experience/prime-age heuristic. It is not an official lineup.</p>
            </div>
            <ProjectedLineupView lineup={lineup} />
          </div>

          <aside className="h-fit rounded-2xl border border-amber-800/70 bg-gradient-to-b from-amber-950/60 to-slate-900 p-5 lg:sticky lg:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Past World Cups</p>
            <h2 className="mt-2 text-xl font-semibold text-amber-50">{trivia.headline}</h2>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-amber-100/80">
              {trivia.facts.map((fact) => <li key={fact} className="border-l-2 border-amber-500/50 pl-3">{fact}</li>)}
            </ul>
          </aside>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Matchday squad</p>
              <h2 className="mt-1 text-xl font-semibold">Predicted substitutes</h2>
            </div>
            <p className="text-xs text-slate-400">{Object.entries(positions).map(([position, count]) => `${count} ${position}`).join(' · ')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lineup.substitutes.map((player) => (
              <div key={player.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-medium text-slate-100">{player.name}</p>
                <p className="mt-1 text-xs text-slate-400">{player.position ?? 'Position not listed'} · Age {getAge(player.dateOfBirth) ?? '—'}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs uppercase tracking-wider text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}

function getAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age;
}

function countPositions(squad: Array<{ position: string | null }>) {
  return squad.reduce<Record<string, number>>((counts, player) => {
    const position = player.position ?? 'Unknown';
    counts[position] = (counts[position] ?? 0) + 1;
    return counts;
  }, {});
}
