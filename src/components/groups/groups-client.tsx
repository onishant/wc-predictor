'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Props = {
  userId: string;
  currentGroupId: string | null;
};

export function GroupsClient({ userId, currentGroupId }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<'create' | 'join'>(currentGroupId ? 'join' : 'create');
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !groupName.trim()) return;
    setLoading(true);
    setError(null);

    const code = crypto.randomUUID().slice(0, 8).toUpperCase();

    const { data: group, error: insertError } = await supabase
      .from('groups')
      .insert({ name: groupName.trim(), invite_code: code, created_by: userId })
      .select('id')
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: group.id })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/leaderboard');
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !inviteCode.trim()) return;
    setLoading(true);
    setError(null);

    const { data: group, error: fetchError } = await supabase
      .from('groups')
      .select('id')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();

    if (fetchError || !group) {
      setError('Invalid invite code.');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: group.id })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push('/leaderboard');
  }

  async function handleLeave() {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('users_profile')
      .update({ group_id: null })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-2 rounded-xl bg-surface-raised p-1">
        <button
          type="button"
          onClick={() => { setMode('create'); setError(null); }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === 'create'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-muted hover:text-heading'
          }`}
        >
          Create group
        </button>
        <button
          type="button"
          onClick={() => { setMode('join'); setError(null); }}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            mode === 'join'
              ? 'bg-cyan-500 text-slate-950'
              : 'text-muted hover:text-heading'
          }`}
        >
          Join group
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/50 p-3 text-sm text-rose-200">
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
            disabled={loading || !groupName.trim()}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create group'}
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
            disabled={loading || !inviteCode.trim()}
            className="w-full rounded-xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? 'Joining…' : 'Join group'}
          </button>
        </form>
      )}

      {currentGroupId && (
        <div className="border-t border-border-subtle pt-4">
          <p className="mb-3 text-sm text-muted">You&apos;re already in a group. Leave it to create or join a different one.</p>
          <button
            type="button"
            onClick={handleLeave}
            disabled={loading}
            className="w-full rounded-xl border border-rose-500/40 px-4 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-950/40 disabled:opacity-50"
          >
            Leave current group
          </button>
        </div>
      )}
    </div>
  );
}
