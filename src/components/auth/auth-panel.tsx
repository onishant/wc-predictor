'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase-browser';

type Team = {
  id: string;
  name: string;
  code: string | null;
  crest_url: string | null;
};

export function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signupToken = searchParams.get('signup_token');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>(signupToken ? 'signup' : 'login');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const isSupabaseReady = Boolean(supabase);

  // Load teams
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('teams')
      .select('id, name, code, crest_url')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('[AuthPanel] teams fetch error:', error);
        }
        setTeams((data as Team[] | null) ?? []);
      });
  }, []);

  // Validate signup token and get group info
  useEffect(() => {
    if (!signupToken || !supabase) return;
    supabase
      .from('group_signup_tokens')
      .select('group_id, groups(name)')
      .eq('token', signupToken)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setMessage('Invalid or expired signup link.');
          return;
        }
        const row = data as unknown as { group_id: string; groups: { name: string } | { name: string }[] };
        setGroupId(row.group_id);
        const g = row.groups;
        setGroupName(Array.isArray(g) ? g[0]?.name : g?.name ?? null);
      });
  }, [signupToken]);

  const filteredTeams = teamSearch
    ? teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()) || (t.code?.toLowerCase().includes(teamSearch.toLowerCase())))
    : teams;

  const selectedTeam = selectedTeamId ? teams.find(t => t.id === selectedTeamId) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseReady) {
      setMessage('Auth is unavailable until Supabase env vars are configured.');
      return;
    }
    setMessage(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.trim(),
              display_name: username.trim(),
              ...(groupId ? { group_id: groupId } : {}),
              ...(selectedTeamId ? { supported_team_id: selectedTeamId } : {}),
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          const userId = data.user!.id;
          if (groupId) {
            await supabase!.from('users_profile').update({ group_id: groupId }).eq('id', userId);
          }
          if (selectedTeamId) {
            await supabase!.from('user_avatar_profiles').update({ supported_team_id: selectedTeamId }).eq('user_id', userId);
          }
          router.push('/');
          return;
        }

        // Email confirmation required — group and team will be assigned on first login
        const pendingMsg = groupId
          ? `Check your email to confirm your account. You'll be assigned to your group after confirmation.`
          : 'Check your email to confirm your account.';
        setMessage(pendingMsg);
      } else {
        const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) { setMessage(error.message); setLoading(false); return; }
        if (!data.session) { setMessage('No session returned. Check your inbox, then try again.'); setLoading(false); return; }
        router.push('/');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {!isSupabaseReady && (
        <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <p className="font-semibold">Configuration needed</p>
          <p className="mt-1 text-xs text-amber-200/70">Supabase env vars are missing, so auth is disabled.</p>
        </div>
      )}

      {signupToken && groupName && (
        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Group invite</p>
          <p className="mt-1 font-semibold">{groupName}</p>
        </div>
      )}

      {signupToken && !groupName && message && (
        <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</div>
      )}

      {/* Tab switcher */}
      <div className="mb-6 flex rounded-xl bg-surface-raised p-1">
        <button
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'login' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-muted hover:text-heading'}`}
          onClick={() => { setMode('login'); setMessage(null); }}
          type="button"
        >Log in</button>
        <button
          className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${mode === 'signup' ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-muted hover:text-heading'}`}
          onClick={() => { setMode('signup'); setMessage(null); }}
          type="button"
        >Sign up</button>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div>
            <label htmlFor="auth-username" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Username</label>
            <input id="auth-username" className="w-full rounded-xl border border-border-default bg-background px-4 py-3 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Your display name" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Email</label>
          <input id="auth-email" className="w-full rounded-xl border border-border-default bg-background px-4 py-3 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="you@example.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label htmlFor="auth-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Password</label>
          <input id="auth-password" className="w-full rounded-xl border border-border-default bg-background px-4 py-3 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {/* Team picker — signup only */}
        {mode === 'signup' && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Your team <span className="font-normal normal-case">(optional)</span>
            </label>
            <p className="mb-2 text-xs text-faint">Pick your favorite team. Their crest will appear on your leaderboard avatar.</p>

            {selectedTeam ? (
              <div className="mb-2 flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2">
                {selectedTeam.crest_url && <Image src={selectedTeam.crest_url} alt="" width={20} height={20} className="object-contain" unoptimized />}
                <span className="text-sm font-medium text-heading">{selectedTeam.name}</span>
                <button type="button" onClick={() => setSelectedTeamId(null)} className="ml-auto text-xs text-muted hover:text-heading">✕</button>
              </div>
            ) : (
              <>
                <input className="mb-2 w-full rounded-xl border border-border-default bg-background px-4 py-2.5 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500" placeholder="Search teams…" value={teamSearch} onChange={(e) => setTeamSearch(e.target.value)} />
                <div className="grid max-h-40 gap-1.5 overflow-y-auto rounded-xl border border-border-subtle bg-background p-2 md:grid-cols-2">
                  {filteredTeams.map((team) => (
                    <button key={team.id} type="button" onClick={() => { setSelectedTeamId(team.id); setTeamSearch(''); }} className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-raised">
                      {team.crest_url && <Image src={team.crest_url} alt="" width={18} height={18} className="object-contain" unoptimized />}
                      <span className="truncate text-heading">{team.name || `[no name: ${team.id}]`}</span>
                    </button>
                  ))}
                  {filteredTeams.length === 0 && <p className="px-3 py-2 text-xs text-muted">No teams match. ({teams.length} total teams loaded)</p>}
                </div>
              </>
            )}
          </div>
        )}

        <button type="submit" disabled={loading || !isSupabaseReady || (!!signupToken && !groupName)} className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50">
          {!isSupabaseReady ? 'Unavailable' : loading ? <span className="inline-flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />Please wait…</span> : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </form>

      {message && !signupToken && <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{message}</div>}

      {mode === 'signup' && !signupToken && <p className="mt-4 text-center text-xs text-muted">By signing up you agree to compete fairly on the leaderboard.</p>}

      <p className="mt-5 text-center text-[10px] leading-relaxed text-faint">This app is an unofficial fan project and is not affiliated with, endorsed by, or associated with FIFA.</p>
    </div>
  );
}
