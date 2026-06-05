'use client';

import { useEffect, useState } from 'react';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import { DEFAULT_AVATAR_PROFILE, normalizeAvatarProfile } from '@/lib/avatar-catalog';
import type { AvatarFeatureId, AvatarId, AvatarProfile } from '@/lib/avatar-catalog';
import { getCharacterTier } from '@/lib/character-progress';
import { supabase } from '@/lib/supabase-browser';
import type { CharacterMood } from '@/lib/character-progress';

type UserProgressRow = {
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

type UserCharacterStageProps = {
  fallbackMood?: CharacterMood;
  height?: 'sm' | 'md' | 'lg';
  label?: string;
};

export function UserCharacterStage({
  fallbackMood = 'idle',
  height = 'sm',
  label = 'Your avatar',
}: UserCharacterStageProps) {
  const [mood, setMood] = useState<CharacterMood>(fallbackMood);
  const [avatarId, setAvatarId] = useState<AvatarId>(DEFAULT_AVATAR_PROFILE.selectedAvatarId);
  const [featureId, setFeatureId] = useState<AvatarFeatureId>(DEFAULT_AVATAR_PROFILE.equippedFeature);
  const [stageLabel, setStageLabel] = useState(label);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function loadProgress() {
      const { data: userData } = await supabase!.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const [{ data: progress }, { data: avatarProfile }] = await Promise.all([
        supabase!
        .from('user_progress')
        .select('points, xp, current_streak, best_streak, character_tier')
        .eq('user_id', userId)
        .maybeSingle<UserProgressRow>(),
        supabase!
          .from('user_avatar_profiles')
          .select('selected_avatar_id, equipped_gesture, equipped_feature, unlocked_gestures, unlocked_features, xp_spent')
          .eq('user_id', userId)
          .maybeSingle<AvatarProfileRow>(),
      ]);

      if (!mounted) return;

      const points = progress?.points ?? 0;
      const tier = progress?.character_tier ?? getCharacterTier(points);
      const normalizedProfile = normalizeAvatarProfile(toAvatarProfile(avatarProfile));
      setMood(normalizedProfile.equippedGesture);
      setAvatarId(normalizedProfile.selectedAvatarId);
      setFeatureId(normalizedProfile.equippedFeature);
      setStageLabel(`${tier} avatar · ${points} pts`);
    }

    loadProgress();

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      loadProgress();
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [fallbackMood, label]);

  return <MixamoCharacterStage mood={mood} avatarId={avatarId} featureId={featureId} height={height} label={stageLabel} />;
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
