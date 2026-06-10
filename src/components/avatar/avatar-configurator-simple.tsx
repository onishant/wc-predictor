'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { AvatarBadge } from '@/components/avatar/avatar-badge';

type Team = {
  id: string;
  name: string;
  crest_url: string | null;
};

export function AvatarConfiguratorSimple() {
  const [userId, setUserId] = useState<string | null>(null);
  const [supportedTeamId, setSupportedTeamId] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamSearch, setTeamSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !supabase) return;
      setUserId(user.id);

      const [avatarRes, teamsRes] = await Promise.all([
        supabase.from('user_avatar_profiles').select('supported_team_id').eq('user_id', user.id).single(),
        supabase.from('teams').select('id, name, crest_url').order('name'),
      ]);

      setSupportedTeamId((avatarRes.data as { supported_team_id: string | null } | null)?.supported_team_id ?? null);
      setTeams((teamsRes.data as Team[] | null) ?? []);
      setLoading(false);
    });
  }, []);

  const selectedTeam = supportedTeamId ? teams.find(t => t.id === supportedTeamId) : null;
  const filteredTeams = teamSearch
    ? teams.filter(t => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
    : teams;

  async function selectTeam(teamId: string | null) {
    if (!supabase || !userId) return;
    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('user_avatar_profiles')
      .update({ supported_team_id: teamId })
      .eq('user_id', userId);

    if (error) {
      setMessage(error.message);
    } else {
      setSupportedTeamId(teamId);
      setMessage(teamId ? 'Team updated!' : 'Team removed.');
    }
    setSaving(false);
  }

  if (loading) {
    return <div className="rounded-2xl border border-border-subtle bg-surface p-6 text-sm text-muted">Loading…</div>;
  }

  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-6 space-y-5">
      {/* Current avatar + team */}
      <div className="flex items-center gap-4">
        <AvatarBadge seed={userId ?? ''} teamCrestUrl={selectedTeam?.crest_url} teamName={selectedTeam?.name} size="lg" />
        <div>
          <p className="text-lg font-semibold text-heading">
            {selectedTeam ? selectedTeam.name : 'No team selected'}
          </p>
          <p className="text-sm text-muted">
            {selectedTeam ? 'This crest appears on your leaderboard avatar.' : 'Pick a team below to show your support.'}
          </p>
        </div>
      </div>

      {/* Selected team display */}
      {selectedTeam && (
        <div className="flex items-center gap-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 px-3 py-2">
          {selectedTeam.crest_url && <Image src={selectedTeam.crest_url} alt="" width={24} height={24} className="object-contain" unoptimized />}
          <span className="font-medium text-heading">{selectedTeam.name}</span>
          <button type="button" onClick={() => selectTeam(null)} disabled={saving} className="ml-auto text-xs text-muted hover:text-heading">Remove</button>
        </div>
      )}

      {/* Search + grid */}
      <div>
        <input
          className="mb-2 w-full rounded-xl border border-border-default bg-background px-4 py-2.5 text-sm text-heading placeholder:text-faint focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          placeholder="Search teams…"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
        />
        <div className="grid max-h-60 gap-1.5 overflow-y-auto rounded-xl border border-border-subtle bg-background p-2 sm:grid-cols-2 md:grid-cols-3">
          {filteredTeams.map((team) => (
            <button
              key={team.id}
              type="button"
              onClick={() => { selectTeam(team.id); setTeamSearch(''); }}
              disabled={saving}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                supportedTeamId === team.id
                  ? 'bg-cyan-500/10 border border-cyan-400/40'
                  : 'hover:bg-surface-raised'
              }`}
            >
              {team.crest_url && <Image src={team.crest_url} alt="" width={20} height={20} className="object-contain" unoptimized />}
              <span className="truncate text-heading">{team.name}</span>
            </button>
          ))}
          {filteredTeams.length === 0 && <p className="px-3 py-2 text-xs text-muted">No teams match.</p>}
        </div>
      </div>

      {message && <p className="text-sm text-cyan-300">{message}</p>}
    </div>
  );
}
