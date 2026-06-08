import { AppNav } from '@/components/app-nav';
import { FixturesClient } from '@/components/fixtures/fixtures-client';
import { getWorldCupData } from '@/lib/world-cup-data';
import { WORLD_CUP_VENUES } from '@/lib/world-cup-venues';
import { supabase } from '@/lib/supabase';

export const revalidate = 300;

export default async function FixturesPage() {
  let apiError: string | null = null;
  let worldCupData: Awaited<ReturnType<typeof getWorldCupData>> | null = null;

  try {
    worldCupData = await getWorldCupData();
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Pick a venue, then predict.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Select a host city from the map or the venue cards below. Fixtures for that venue appear on the right — tap any match to make your prediction.
          </p>
        </header>

        {!supabase && (
          <p className="mt-2 text-amber-300">
            Supabase auth is not configured yet, so predictions are disabled.
          </p>
        )}
        {apiError && <p className="mt-2 text-red-400">Failed to load World Cup data from Supabase: {apiError}</p>}

        {worldCupData && <p className="text-sm text-slate-400">Source: Supabase · Last refreshed by the World Cup sync</p>}

        {worldCupData && (
          <FixturesClient
            venues={WORLD_CUP_VENUES}
            matches={matches}
            userId=""
            teamStats={worldCupData.teamStats}
          />
        )}
      </div>
    </main>
  );
}
