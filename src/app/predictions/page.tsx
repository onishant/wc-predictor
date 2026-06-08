import { AppNav } from '@/components/app-nav';
import { TournamentPredictionsClient } from '@/components/ml/tournament-predictions-client';
import { getMLDashboard, isMLAPIAvailable } from '@/lib/ml-api';

export const revalidate = 300;

export default async function MLPredictionsPage() {
  const mlAvailable = await isMLAPIAvailable();
  const dashboard = mlAvailable ? await getMLDashboard() : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-purple-950/20 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Machine Learning</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tournament Predictions</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Elo-Poisson model running {dashboard?.simulations?.toLocaleString() ?? '...'} Monte Carlo simulations
            to predict World Cup 2026 outcomes. Model: {String(dashboard?.model?.type ?? '...')}.
          </p>
        </header>

        {!mlAvailable && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-amber-300">ML API is not available</p>
            <p className="mt-2 text-xs text-amber-200/80">
              Start the WC-2026-ML server on port 8000 to see predictions.
            </p>
          </div>
        )}

        {dashboard && <TournamentPredictionsClient dashboard={dashboard} />}
      </div>
    </main>
  );
}
