import { PredictionForm } from '@/components/fixtures/prediction-form';
import { getWorldCupScheduleAndStats } from '@/lib/football-data';
import { supabase } from '@/lib/supabase';

export default async function FixturesPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let apiError: string | null = null;
  let worldCupData: Awaited<ReturnType<typeof getWorldCupScheduleAndStats>> | null = null;

  try {
    worldCupData = await getWorldCupScheduleAndStats();
  } catch (error) {
    apiError = error instanceof Error ? error.message : 'Unknown API error';
  }

  const matches = worldCupData?.schedule ?? [];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">World Cup Fixtures</h1>
        {!user && <p className="mt-2 text-amber-300">Login required to submit predictions.</p>}
        {apiError && <p className="mt-2 text-red-400">Failed to load World Cup data: {apiError}</p>}

        {worldCupData && (
          <p className="mt-2 text-sm text-slate-400">
            Source: {worldCupData.competition.name} ({worldCupData.competition.code})
          </p>
        )}

        {worldCupData && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold">Team stats (finished matches)</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Team</th>
                    <th className="px-3 py-2 text-right">P</th>
                    <th className="px-3 py-2 text-right">W</th>
                    <th className="px-3 py-2 text-right">D</th>
                    <th className="px-3 py-2 text-right">L</th>
                    <th className="px-3 py-2 text-right">GF</th>
                    <th className="px-3 py-2 text-right">GA</th>
                    <th className="px-3 py-2 text-right">GD</th>
                    <th className="px-3 py-2 text-right">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {worldCupData.teamStats.map((t) => (
                    <tr key={t.teamId} className="border-t border-slate-800 bg-slate-950">
                      <td className="px-3 py-2">{t.teamName}</td>
                      <td className="px-3 py-2 text-right">{t.played}</td>
                      <td className="px-3 py-2 text-right">{t.won}</td>
                      <td className="px-3 py-2 text-right">{t.drawn}</td>
                      <td className="px-3 py-2 text-right">{t.lost}</td>
                      <td className="px-3 py-2 text-right">{t.goalsFor}</td>
                      <td className="px-3 py-2 text-right">{t.goalsAgainst}</td>
                      <td className="px-3 py-2 text-right">{t.goalDifference}</td>
                      <td className="px-3 py-2 text-right font-semibold text-cyan-300">{t.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-8 space-y-3">
          <h2 className="text-xl font-semibold">Match schedule</h2>
          {matches.map((m) => {
            const kickoffUtc = m.utcDate;
            const isFinished = m.status === 'FINISHED';

            return (
              <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">
                  {m.stage ?? 'Stage TBD'} {m.group ? `· ${m.group}` : ''} · {new Date(kickoffUtc).toLocaleString()}
                </p>
                <h3 className="mt-1 text-lg font-semibold">
                  {m.homeTeam} vs {m.awayTeam}
                </h3>
                <p className="text-sm text-slate-400">Status: {m.status}</p>
                {isFinished && (
                  <p className="mt-1 text-sm text-cyan-300">
                    Final: {m.homeScore ?? '-'} - {m.awayScore ?? '-'}
                  </p>
                )}
                {user && (
                  <PredictionForm
                    matchId={String(m.id)}
                    homeTeam={m.homeTeam}
                    awayTeam={m.awayTeam}
                    kickoffUtc={kickoffUtc}
                    userId={user.id}
                  />
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
