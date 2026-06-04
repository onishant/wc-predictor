import { VenueMap } from '@/components/fixtures/venue-map';
import { TeamBadge } from '@/components/fixtures/team-badge';
import { AppNav } from '@/components/app-nav';
import { FormStrip } from '@/components/teams/form-strip';
import { getWorldCupScheduleAndStats } from '@/lib/football-data';
import { WORLD_CUP_VENUES } from '@/lib/world-cup-venues';
import { supabase } from '@/lib/supabase';

export default async function FixturesPage() {
  let apiError: string | null = null;
  let worldCupData: Awaited<ReturnType<typeof getWorldCupScheduleAndStats>> | null = null;

  try {
    worldCupData = await getWorldCupScheduleAndStats();
  } catch (error) {
    apiError = error instanceof Error ? error.message : 'Unknown API error';
  }

  const matches = worldCupData?.schedule ?? [];

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup fixtures</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pick matches from the map.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            The top of the page now shows the host cities and stadium locations first. Select a venue to orient yourself, then scroll into the fixtures to make predictions.
          </p>
        </header>

        {!supabase && (
          <p className="mt-2 text-amber-300">
            Supabase auth is not configured yet, so predictions are disabled.
          </p>
        )}
        {apiError && <p className="mt-2 text-red-400">Failed to load World Cup data: {apiError}</p>}

        {worldCupData && <p className="text-sm text-slate-400">Source: {worldCupData.competition.name} ({worldCupData.competition.code})</p>}

        {worldCupData && (
          <VenueMap venues={WORLD_CUP_VENUES} matches={matches} userId="" />
        )}

        {worldCupData && (
          <section className="space-y-3">
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
                    <th className="px-3 py-2 text-left">Form</th>
                  </tr>
                </thead>
                <tbody>
                  {worldCupData.teamStats.map((t) => (
                    <tr key={t.teamId} className="border-t border-slate-800 bg-slate-950">
                      <td className="px-3 py-2">
                        <TeamBadge team={t.teamVisual} size="sm" />
                      </td>
                      <td className="px-3 py-2 text-right">{t.played}</td>
                      <td className="px-3 py-2 text-right">{t.won}</td>
                      <td className="px-3 py-2 text-right">{t.drawn}</td>
                      <td className="px-3 py-2 text-right">{t.lost}</td>
                      <td className="px-3 py-2 text-right">{t.goalsFor}</td>
                      <td className="px-3 py-2 text-right">{t.goalsAgainst}</td>
                      <td className="px-3 py-2 text-right">{t.goalDifference}</td>
                      <td className="px-3 py-2 text-right font-semibold text-cyan-300">{t.points}</td>
                      <td className="px-3 py-2"><FormStrip form={t.recentForm} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
