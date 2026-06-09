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
    <main className="min-h-screen bg-background px-4 py-6 text-body sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">World Cup fixtures</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-heading sm:text-4xl">Pick a venue, then predict.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Select a host city from the map or the venue cards below. Fixtures for that venue appear on the right — tap any match to make your prediction.
          </p>
        </header>

        {!supabase && (
          <p className="mt-2 text-amber-400">
            Supabase auth is not configured yet, so predictions are disabled.
          </p>
        )}
        {apiError && <p className="mt-2 text-danger">Failed to load World Cup data from Supabase: {apiError}</p>}

        {worldCupData && <p className="text-sm text-muted">Source: Supabase · Last refreshed by the World Cup sync</p>}

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
