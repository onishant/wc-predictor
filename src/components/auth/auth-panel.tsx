'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

export function AuthPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const isSupabaseReady = Boolean(supabase);

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
        const { data, error } = await supabase!.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user && username.trim()) {
          await supabase!.from('users_profile').upsert({ id: data.user.id, username: username.trim() });
        }

        setMessage('Signup successful. Check your email if confirmation is enabled.');
      } else {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage('Logged in.');
        window.location.reload();
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      {!isSupabaseReady && (
        <p className="mb-4 rounded-lg border border-amber-900/60 bg-amber-950/50 px-3 py-2 text-sm text-amber-200">
          Supabase env vars are missing, so auth is disabled for now.
        </p>
      )}
      <div className="mb-4 flex gap-2">
        <button className={`rounded px-3 py-1 text-sm ${mode === 'login' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800'}`} onClick={() => setMode('login')} type="button">Login</button>
        <button className={`rounded px-3 py-1 text-sm ${mode === 'signup' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800'}`} onClick={() => setMode('signup')} type="button">Sign up</button>
      </div>
      <form className="space-y-3" onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <input
            className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        )}
        <input
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button disabled={loading || !isSupabaseReady} className="rounded bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60">
          {!isSupabaseReady ? 'Unavailable' : loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
        </button>
      </form>
      {message && <p className="mt-3 text-sm text-slate-300">{message}</p>}
    </div>
  );
}
