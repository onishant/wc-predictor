'use client';

import { useState, useEffect } from 'react';
import { AppNav } from '@/components/app-nav';
import { supabase } from '@/lib/supabase-browser';

type GroupInfo = {
  id: string;
  name: string;
  invite_code: string;
};

export default function GroupsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [currentGroup, setCurrentGroup] = useState<GroupInfo | null>(null);
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !supabase) return;
      setUserId(user.id);

      supabase
        .from('users_profile')
        .select('group_id, groups(id, name, invite_code)')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.group_id && data.groups) {
            const g = Array.isArray(data.groups) ? data.groups[0] : data.groups;
            if (g) setCurrentGroup(g as GroupInfo);
          }
          setLoading(false);
        });
    });
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !userId || !groupName.trim()) return;
    setActionLoading(true);
    setError(null);

    const code = crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data: group, error: insertError } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), invite_code: code, created_by: userId })
      .select('id, name, invite_code')
      .single();

    if (insertError) {
      setError(insertError.message);
      setActionLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: group.id })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(false);
      return;
    }

    setCurrentGroup(group as GroupInfo);
    setActionLoading(false);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !userId || !inviteCode.trim()) return;
    setActionLoading(true);
    setError(null);

    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('id, name, invite_code')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();

    if (fetchError || !group) {
      setError('Invalid invite code.');
      setActionLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: group.id })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(false);
      return;
    }

    setCurrentGroup(group as GroupInfo);
    setActionLoading(false);
  }

  async function handleLeave() {
    if (!supabase || !userId) return;
    setActionLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: null })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setActionLoading(false);
      return;
    }

    setCurrentGroup(null);
    setActionLoading(false);
  }

  if (!supabase || loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <AppNav />
          <p className="mt-6 text-sm text-muted">{!supabase ? 'Supabase is not configured.' : 'Loading…'}</p>
        </div>
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md">
          <AppNav />
          <p className="mt-6 text-sm text-muted">Please log in first.</p>
          <a href="/auth" className="mt-3 inline-block rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <AppNav />

        <header className="mt-6 mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">World Cup predictor</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-2 text-sm text-body">
            Create or join a group to compete on a private leaderboard. You can also see your overall ranking.
          </p>
        </header>

        {currentGroup && (
          <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">Current group</p>
            <p className="mt-1 text-lg font-semibold text-heading">{currentGroup.name}</p>
            <p className="mt-1 text-sm text-muted">
              Invite code:{' '}
              <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs tracking-wider text-heading">
                {currentGroup.invite_code}
              </code>
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 rounded-xl bg-surface-raised p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('create'); setError(null); }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'create' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
            }`}
          >
            Create group
          </button>
          <button
            type="button"
            onClick={() => { setMode('join'); setError(null); }}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === 'join' ? 'bg-cyan-500 text-slate-950' : 'text-muted hover:text-heading'
            }`}
          >
            Join group
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-900/60 bg-rose-950/50 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="groupName" className="mb-1.5 block text-sm font-medium text-heading">
                Group name
              </label>
              <input
                id="groupName"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g. Office Predictions"
                required
                className="w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading || !groupName.trim()}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {actionLoading ? 'Creating…' : 'Create group'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="inviteCode" className="mb-1.5 block text-sm font-medium text-heading">
                Invite code
              </label>
              <input
                id="inviteCode"
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="e.g. A1B2C3D4"
                required
                className="w-full rounded-xl border border-border-default bg-surface px-4 py-3 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 uppercase tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={actionLoading || !inviteCode.trim()}
              className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              {actionLoading ? 'Joining…' : 'Join group'}
            </button>
          </form>
        )}

        {currentGroup && (
          <div className="border-t border-border-subtle pt-4 mt-6">
            <p className="mb-3 text-sm text-muted">
              Leave your current group to create or join a different one.
            </p>
            <button
              type="button"
              onClick={handleLeave}
              disabled={actionLoading}
              className="w-full rounded-xl border border-rose-500/40 px-4 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-950/40 disabled:opacity-50"
            >
              Leave current group
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
