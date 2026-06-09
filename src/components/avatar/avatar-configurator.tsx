'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import {
  AVATAR_ARCHETYPES,
  DEFAULT_AVATAR_PROFILE,
  FEATURE_UNLOCKS,
  GESTURE_UNLOCKS,
  normalizeAvatarProfile,
} from '@/lib/avatar-catalog';
import type { AvatarFeatureId, AvatarId, AvatarProfile } from '@/lib/avatar-catalog';
import { getCharacterTier } from '@/lib/character-progress';
import type { CharacterMood } from '@/lib/character-progress';
import { supabase } from '@/lib/supabase-browser';

type ProgressRow = {
  points: number | null;
  xp: number | null;
  current_streak: number | null;
  best_streak: number | null;
  character_tier: string | null;
};

type AvatarProfileRow = {
  selected_avatar_id: AvatarId | null;
  equipped_gesture: CharacterMood | null;
  equipped_feature: AvatarFeatureId | null;
  unlocked_gestures: CharacterMood[] | null;
  unlocked_features: Exclude<AvatarFeatureId, 'none'>[] | null;
  xp_spent: number | null;
};

export function AvatarConfigurator() {
  const [userId, setUserId] = useState('');
  const [progress, setProgress] = useState<ProgressRow | null>(null);
  const [profile, setProfile] = useState<AvatarProfile>(DEFAULT_AVATAR_PROFILE);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const totalXp = progress?.xp ?? 0;
  const availableXp = Math.max(0, totalXp - profile.xpSpent);
  const tier = progress?.character_tier ?? getCharacterTier(progress?.points ?? 0);
  const selectedAvatar = AVATAR_ARCHETYPES.find((avatar) => avatar.id === profile.selectedAvatarId) ?? AVATAR_ARCHETYPES[0];

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function load() {
      setLoading(true);
      const { data: userData } = await supabase!.auth.getUser();
      const authUserId = userData.user?.id ?? '';
      if (!mounted) return;

      setUserId(authUserId);
      if (!authUserId) {
        setLoading(false);
        return;
      }

      const [{ data: progressData }, { data: profileData }] = await Promise.all([
        supabase!
          .from('user_progress')
          .select('points, xp, current_streak, best_streak, character_tier')
          .eq('user_id', authUserId)
          .maybeSingle<ProgressRow>(),
        supabase!
          .from('user_avatar_profiles')
          .select('selected_avatar_id, equipped_gesture, equipped_feature, unlocked_gestures, unlocked_features, xp_spent')
          .eq('user_id', authUserId)
          .maybeSingle<AvatarProfileRow>(),
      ]);

      if (!mounted) return;
      setProgress(progressData ?? { points: 0, xp: 0, current_streak: 0, best_streak: 0, character_tier: 'Rookie' });
      setProfile(normalizeAvatarProfile(toAvatarProfile(profileData)));
      setLoading(false);
    }

    load();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const nextUnlockCost = useMemo(() => {
    const lockedGestures = GESTURE_UNLOCKS.filter((gesture) => !profile.unlockedGestures.includes(gesture.id));
    const lockedFeatures = FEATURE_UNLOCKS.filter((feature) => !profile.unlockedFeatures.includes(feature.id));
    return [...lockedGestures, ...lockedFeatures].sort((a, b) => a.cost - b.cost)[0]?.cost ?? null;
  }, [profile.unlockedFeatures, profile.unlockedGestures]);

  async function saveProfile(nextProfile: AvatarProfile, statusMessage: string) {
    if (!supabase || !userId) return;

    const { error } = await supabase.from('user_avatar_profiles').upsert({
      user_id: userId,
      selected_avatar_id: nextProfile.selectedAvatarId,
      equipped_gesture: nextProfile.equippedGesture,
      equipped_feature: nextProfile.equippedFeature,
      unlocked_gestures: nextProfile.unlockedGestures,
      unlocked_features: nextProfile.unlockedFeatures,
      xp_spent: nextProfile.xpSpent,
    }, { onConflict: 'user_id' });

    if (error) {
      setMessage(error.message);
      return;
    }

    setProfile(nextProfile);
    setMessage(statusMessage);
  }

  function selectAvatar(avatarId: AvatarId) {
    const avatar = AVATAR_ARCHETYPES.find((item) => item.id === avatarId);
    if (!avatar) return;

    const unlockedGestures = profile.unlockedGestures.includes(avatar.defaultGesture)
      ? profile.unlockedGestures
      : [...profile.unlockedGestures, avatar.defaultGesture];

    saveProfile({
      ...profile,
      selectedAvatarId: avatarId,
      equippedGesture: avatar.defaultGesture,
      unlockedGestures,
    }, `${avatar.name} selected.`);
  }

  function equipGesture(gestureId: CharacterMood) {
    if (!profile.unlockedGestures.includes(gestureId)) return;
    saveProfile({ ...profile, equippedGesture: gestureId }, 'Gesture equipped.');
  }

  function equipFeature(featureId: AvatarFeatureId) {
    if (featureId !== 'none' && !profile.unlockedFeatures.includes(featureId)) return;
    saveProfile({ ...profile, equippedFeature: featureId }, 'Feature equipped.');
  }

  function unlockGesture(gestureId: CharacterMood, cost: number) {
    if (profile.unlockedGestures.includes(gestureId) || availableXp < cost) return;
    saveProfile({
      ...profile,
      equippedGesture: gestureId,
      unlockedGestures: [...profile.unlockedGestures, gestureId],
      xpSpent: profile.xpSpent + cost,
    }, 'Gesture unlocked and equipped.');
  }

  function unlockFeature(featureId: Exclude<AvatarFeatureId, 'none'>, cost: number) {
    if (profile.unlockedFeatures.includes(featureId) || availableXp < cost) return;
    saveProfile({
      ...profile,
      equippedFeature: featureId,
      unlockedFeatures: [...profile.unlockedFeatures, featureId],
      xpSpent: profile.xpSpent + cost,
    }, 'Feature unlocked and equipped.');
  }

  if (!supabase) {
    return <PanelMessage message="Supabase auth is not configured, so avatar setup is unavailable." />;
  }

  if (loading) {
    return <PanelMessage message="Loading avatar setup..." />;
  }

  if (!userId) {
    return <PanelMessage message="Login required to configure your avatar." />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <section className="space-y-4">
        <MixamoCharacterStage
          mood={profile.equippedGesture}
          avatarId={profile.selectedAvatarId}
          featureId={profile.equippedFeature}
          height="lg"
          label={`${selectedAvatar.name} · ${tier}`}
        />
        <div className="rounded-2xl border border-border-subtle bg-surface p-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Total XP" value={totalXp} />
            <Stat label="Available XP" value={availableXp} />
            <Stat label="Spent XP" value={profile.xpSpent} />
            <Stat label="Tier" value={tier} />
          </div>
          {nextUnlockCost != null && (
            <p className="mt-3 text-sm text-muted">Next unlock starts at {nextUnlockCost} XP.</p>
          )}
          {message && <p className="mt-3 text-sm text-cyan-300">{message}</p>}
        </div>
      </section>

      <section className="space-y-5">
        <ConfiguratorSection title="Choose Starter Avatar">
          <div className="grid gap-3 md:grid-cols-3">
            {AVATAR_ARCHETYPES.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => selectAvatar(avatar.id)}
                className={`rounded-2xl border p-4 text-left transition ${
                  profile.selectedAvatarId === avatar.id
                    ? 'border-cyan-400 bg-cyan-500/10'
                    : 'border-border-subtle bg-surface hover:border-border-strong'
                }`}
              >
                <p className="text-lg font-semibold" style={{ color: avatar.accent }}>{avatar.name}</p>
                <p className="mt-2 text-sm leading-5 text-muted">{avatar.description}</p>
              </button>
            ))}
          </div>
        </ConfiguratorSection>

        <ConfiguratorSection title="Unlock Gestures">
          <div className="grid gap-3 md:grid-cols-2">
            {GESTURE_UNLOCKS.map((gesture) => {
              const unlocked = profile.unlockedGestures.includes(gesture.id);
              const equipped = profile.equippedGesture === gesture.id;
              return (
                <UnlockCard
                  key={gesture.id}
                  title={gesture.name}
                  description={gesture.description}
                  cost={gesture.cost}
                  unlocked={unlocked}
                  equipped={equipped}
                  canAfford={availableXp >= gesture.cost}
                  onUnlock={() => unlockGesture(gesture.id, gesture.cost)}
                  onEquip={() => equipGesture(gesture.id)}
                />
              );
            })}
          </div>
        </ConfiguratorSection>

        <ConfiguratorSection title="Unlock Features">
          <div className="grid gap-3 md:grid-cols-2">
            <UnlockCard
              title="No feature"
              description="Keep the avatar clean."
              cost={0}
              unlocked
              equipped={profile.equippedFeature === 'none'}
              canAfford
              onUnlock={() => equipFeature('none')}
              onEquip={() => equipFeature('none')}
            />
            {FEATURE_UNLOCKS.map((feature) => {
              const unlocked = profile.unlockedFeatures.includes(feature.id);
              const equipped = profile.equippedFeature === feature.id;
              return (
                <UnlockCard
                  key={feature.id}
                  title={feature.name}
                  description={feature.description}
                  cost={feature.cost}
                  unlocked={unlocked}
                  equipped={equipped}
                  canAfford={availableXp >= feature.cost}
                  onUnlock={() => unlockFeature(feature.id, feature.cost)}
                  onEquip={() => equipFeature(feature.id)}
                />
              );
            })}
          </div>
        </ConfiguratorSection>
      </section>
    </div>
  );
}

function ConfiguratorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function UnlockCard({
  title,
  description,
  cost,
  unlocked,
  equipped,
  canAfford,
  onUnlock,
  onEquip,
}: {
  title: string;
  description: string;
  cost: number;
  unlocked: boolean;
  equipped: boolean;
  canAfford: boolean;
  onUnlock: () => void;
  onEquip: () => void;
}) {
  return (
    <article className="rounded-2xl border border-border-subtle bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-5 text-muted">{description}</p>
        </div>
        <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-cyan-300">{cost} XP</span>
      </div>
      <button
        onClick={unlocked ? onEquip : onUnlock}
        disabled={!unlocked && !canAfford}
        className="mt-4 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {equipped ? 'Equipped' : unlocked ? 'Equip' : canAfford ? 'Unlock' : 'Need XP'}
      </button>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-background p-3 ring-1 ring-border-subtle">
      <p className="text-xs uppercase tracking-[0.16em] text-faint">{label}</p>
      <p className="mt-1 text-xl font-semibold text-heading">{value}</p>
    </div>
  );
}

function PanelMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-surface p-5 text-sm text-body">
      {message}
    </div>
  );
}

function toAvatarProfile(row: AvatarProfileRow | null): Partial<AvatarProfile> | null {
  if (!row) return null;

  return {
    selectedAvatarId: row.selected_avatar_id ?? undefined,
    equippedGesture: row.equipped_gesture ?? undefined,
    equippedFeature: row.equipped_feature ?? undefined,
    unlockedGestures: row.unlocked_gestures ?? undefined,
    unlockedFeatures: row.unlocked_features ?? undefined,
    xpSpent: row.xp_spent ?? undefined,
  };
}
