'use client';

import { useEffect, useState } from 'react';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import { getCharacterTier, getMoodForProgress } from '@/lib/character-progress';
import { supabase } from '@/lib/supabase-browser';
import type { CharacterMood } from '@/lib/character-progress';

type UserProgressRow = {
  points: number | null;
  xp: number | null;
  current_streak: number | null;
  best_streak: number | null;
  character_tier: string | null;
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
  const [stageLabel, setStageLabel] = useState(label);

  useEffect(() => {
    if (!supabase) return;

    let mounted = true;

    async function loadProgress() {
      const { data: userData } = await supabase!.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;

      const { data } = await supabase!
        .from('user_progress')
        .select('points, xp, current_streak, best_streak, character_tier')
        .eq('user_id', userId)
        .maybeSingle<UserProgressRow>();

      if (!mounted || !data) return;

      const points = data.points ?? 0;
      const tier = data.character_tier ?? getCharacterTier(points);
      setMood(getMoodForProgress({ currentStreak: data.current_streak ?? 0, characterTier: tier }));
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

  return <MixamoCharacterStage mood={mood} height={height} label={stageLabel} />;
}
