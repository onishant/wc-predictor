import { PredictionForm } from '@/components/fixtures/prediction-form';
import { supabase } from '@/lib/supabase';

export default async function FixturesPage() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, stage, kickoff_utc, status, home_score, away_score, home_team_id, away_team_id')
    .order('kickoff_utc', { ascending: true })
    .limit(30);

  const teamIds = new Set<string>();
  matches?.forEach((m) => {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  });

  const { data: teams } = teamIds.size
    ? await supabase.from('teams').select('id, name').in('id', [...teamIds])
    : { data: [] as { id: string; name: string }[] };

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t.name]));

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold">Fixtures</h1>
        {!user && <p className="mt-2 text-amber-300">Login required to submit predictions.</p>}
        {error && <p className="mt-2 text-red-400">Failed to load matches: {error.message}</p>}

        <div className="mt-6 space-y-3">
          {(matches ?? []).map((m) => {
            const home = m.home_team_id ? teamMap.get(m.home_team_id) ?? 'Home' : 'Home';
            const away = m.away_team_id ? teamMap.get(m.away_team_id) ?? 'Away' : 'Away';
            return (
              <div key={m.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <p className="text-sm text-slate-400">{m.stage ?? 'Stage TBD'} · {new Date(m.kickoff_utc).toLocaleString()}</p>
                <h2 className="mt-1 text-lg font-semibold">{home} vs {away}</h2>
                <p className="text-sm text-slate-400">Status: {m.status}</p>
                {m.status === 'finished' && (
                  <p className="mt-1 text-sm text-cyan-300">Final: {m.home_score} - {m.away_score}</p>
                )}
                {user && (
                  <PredictionForm
                    matchId={m.id}
                    homeTeam={home}
                    awayTeam={away}
                    kickoffUtc={m.kickoff_utc}
                    userId={user.id}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
