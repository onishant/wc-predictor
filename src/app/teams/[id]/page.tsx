import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppNav } from '@/components/app-nav';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { FormStrip } from '@/components/teams/form-strip';
import { getWorldCupScheduleAndStats, getWorldCupTeamProfiles } from '@/lib/football-data';
import { getFlagUrlForTeamCode } from '@/lib/team-visuals';

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

        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl font-semibold">Player squad</h2>
            <p className="text-xs text-slate-400">{Object.entries(positions).map(([position, count]) => `${count} ${position}`).join(' · ')}</p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Player</th>
                  <th className="px-4 py-3 text-left">Position</th>
                  <th className="px-4 py-3 text-left">Nationality</th>
                  <th className="px-4 py-3 text-right">Age</th>
                </tr>
              </thead>
              <tbody>
                {team.squad.map((player) => (
                  <tr key={player.id} className="border-t border-slate-800 bg-slate-950">
                    <td className="px-4 py-3 font-medium text-slate-100">{player.name}</td>
                    <td className="px-4 py-3 text-slate-300">{player.position ?? 'Not listed'}</td>
                    <td className="px-4 py-3 text-slate-300">{player.nationality ?? 'Not listed'}</td>
                    <td className="px-4 py-3 text-right text-slate-300">{getAge(player.dateOfBirth) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
