'use client';

import { useState, useEffect, useCallback } from 'react';
import { AppNav } from '@/components/app-nav';
import { supabase } from '@/lib/supabase-browser';

type Group = {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

type SignupToken = {
  id: string;
  group_id: string;
  token: string;
  uses_remaining: number;
  created_at: string;
  group_name?: string;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [tokens, setTokens] = useState<SignupToken[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!supabase) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from('users_profile')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile query error:', profileError);
      setLoading(false);
      return;
    }

    if ((profile as { role: string } | null)?.role !== 'admin') {
      console.log('User role:', (profile as { role: string } | null)?.role, 'User ID:', user.id);
      setLoading(false);
      return;
    }

    setIsAdmin(true);

    const [groupsRes, tokensRes] = await Promise.all([
      supabase.from('groups').select('id, name, invite_code, created_at').order('created_at', { ascending: false }),
      supabase.from('group_signup_tokens').select('id, group_id, token, uses_remaining, created_at').order('created_at', { ascending: false }),
    ]);

    setGroups((groupsRes.data as Group[] | null) ?? []);

    const tokenData = (tokensRes.data as SignupToken[] | null) ?? [];
    const groupMap = new Map(((groupsRes.data as Group[] | null) ?? []).map(g => [g.id, g.name]));
    setTokens(tokenData.map(t => ({ ...t, group_name: groupMap.get(t.group_id) ?? 'Unknown' })));

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    (async () => { await loadData(); })();
  }, [loadData]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !newGroupName.trim()) return;
    setActionLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setActionLoading(false); return; }

    const code = crypto.randomUUID().slice(0, 8).toUpperCase();
    const { error } = await supabase
      .from('groups')
      .insert({ name: newGroupName.trim(), invite_code: code, created_by: user.id });

    if (error) {
      setMessage(error.message);
    } else {
      setNewGroupName('');
      setMessage('Group created.');
      await loadData();
    }
    setActionLoading(false);
  }

  async function generateSignupLink(groupId: string) {
    if (!supabase) return;
    setActionLoading(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setActionLoading(false); return; }

    const token = crypto.randomUUID().replace(/-/g, '');
    const { error } = await supabase
      .from('group_signup_tokens')
      .insert({ group_id: groupId, token, created_by: user.id, uses_remaining: -1 });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Signup link generated.');
      await loadData();
    }
    setActionLoading(false);
  }

  async function deleteToken(tokenId: string) {
    if (!supabase) return;
    setActionLoading(true);
    const { error } = await supabase.from('group_signup_tokens').delete().eq('id', tokenId);
    if (error) setMessage(error.message);
    else { setMessage('Token deleted.'); await loadData(); }
    setActionLoading(false);
  }

  async function deleteGroup(groupId: string) {
    if (!supabase) return;
    if (!confirm('Delete this group and all its signup tokens?')) return;
    setActionLoading(true);
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) setMessage(error.message);
    else { setMessage('Group deleted.'); await loadData(); }
    setActionLoading(false);
  }

  function getSignupUrl(token: string) {
    return `${window.location.origin}/auth?signup_token=${token}`;
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setMessage('Copied to clipboard.');
  }

  if (!supabase) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl"><AppNav /><p className="mt-6 text-sm text-muted">Supabase not configured.</p></div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl"><AppNav /><p className="mt-6 text-sm text-muted">Loading…</p></div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <AppNav />
          <div className="mt-6 rounded-2xl border border-rose-500/30 bg-rose-950/30 p-6 text-center">
            <p className="text-lg font-semibold text-rose-300">Access denied</p>
            <p className="mt-2 text-sm text-muted">Admin access required.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-8 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <AppNav />

        <header className="mt-6 mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Manage Groups</h1>
          <p className="mt-2 text-sm text-body">Create groups and generate signup links for users to join.</p>
        </header>

        {message && (
          <div className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm text-cyan-200">
            {message}
            <button onClick={() => setMessage(null)} className="ml-2 text-cyan-400 hover:text-cyan-300">✕</button>
          </div>
        )}

        {/* Create group */}
        <section className="mb-8 rounded-2xl border border-border-subtle bg-surface p-5">
          <h2 className="text-lg font-semibold mb-4">Create new group</h2>
          <form onSubmit={createGroup} className="flex gap-3">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name"
              required
              className="flex-1 rounded-xl border border-border-default bg-background px-4 py-2.5 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={actionLoading || !newGroupName.trim()}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </section>

        {/* Groups list */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Groups ({groups.length})</h2>

          {groups.length === 0 && (
            <p className="text-sm text-muted">No groups yet.</p>
          )}

          {groups.map((group) => {
            const groupTokens = tokens.filter(t => t.group_id === group.id);
            return (
              <div key={group.id} className="rounded-2xl border border-border-subtle bg-surface p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{group.name}</h3>
                    <p className="text-xs text-muted mt-1">
                      Code: <code className="rounded bg-surface-raised px-1.5 py-0.5 text-xs tracking-wider">{group.invite_code}</code>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => generateSignupLink(group.id)}
                      disabled={actionLoading}
                      className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                    >
                      Generate link
                    </button>
                    <button
                      onClick={() => deleteGroup(group.id)}
                      disabled={actionLoading}
                      className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Signup links */}
                {groupTokens.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Signup links</p>
                    {groupTokens.map((token) => (
                      <div key={token.id} className="flex items-center gap-2 rounded-lg border border-border-subtle bg-background p-2.5">
                        <code className="flex-1 truncate text-xs text-body">{getSignupUrl(token.token)}</code>
                        <button
                          onClick={() => copyToClipboard(getSignupUrl(token.token))}
                          className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/30"
                        >
                          Copy
                        </button>
                        <button
                          onClick={() => deleteToken(token.id)}
                          className="rounded bg-rose-500/20 px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/30"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
