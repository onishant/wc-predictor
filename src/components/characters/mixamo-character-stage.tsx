'use client';

import { Canvas } from '@react-three/fiber';
import { ContactShadows, Environment, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { CharacterMood } from '@/lib/character-progress';
import manifest from '../../../public/assets/characters/mixamo/manifest.json';

type MixamoCharacterStageProps = {
  mood?: CharacterMood;
  height?: 'sm' | 'md' | 'lg';
  label?: string;
};

const heightClass = {
  sm: 'h-40',
  md: 'h-56',
  lg: 'h-72',
} satisfies Record<NonNullable<MixamoCharacterStageProps['height']>, string>;

const animationOrder = Object.keys(manifest.animations) as CharacterMood[];

export function MixamoCharacterStage({
  mood = 'idle',
  height = 'md',
  label = manifest.character.name,
}: MixamoCharacterStageProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 ${heightClass[height]}`}>
      <Canvas
        camera={{ position: [0, 1.35, 8], fov: 32 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.35} />
          <directionalLight position={[3, 4, 3]} intensity={2.4} />
          <CharacterModel mood={mood} />
          <ContactShadows position={[0, -1.28, 0]} opacity={0.36} scale={5} blur={2.4} far={2.2} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{label}</p>
      </div>
    </div>
  );
}

function CharacterModel({ mood }: { mood: CharacterMood }) {
  const group = useRef<Group>(null);
  const character = useGLTF(manifest.character.model);
  const idle = useGLTF(manifest.animations.idle);
  const excited = useGLTF(manifest.animations.excited);
  const victory = useGLTF(manifest.animations.victory);
  const defeat = useGLTF(manifest.animations.defeat);
  const jogging = useGLTF(manifest.animations.jogging);
  const goalkeeperCatchMedium = useGLTF(manifest.animations.goalkeeperCatchMedium);
  const goalkeeperCatchHigh = useGLTF(manifest.animations.goalkeeperCatchHigh);

  const scene = useMemo(() => clone(character.scene), [character.scene]);
  const clips = useMemo(
    () =>
      [
        idle,
        excited,
        victory,
        defeat,
        jogging,
        goalkeeperCatchMedium,
        goalkeeperCatchHigh,
      ].flatMap((asset, index) =>
        asset.animations.map((clip) => {
            const namedClip = clip.clone();
            namedClip.name = animationOrder[index];
            return namedClip;
          }),
        ),
    [idle, excited, victory, defeat, jogging, goalkeeperCatchMedium, goalkeeperCatchHigh],
  );

  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const activeAction = actions[mood] ?? actions.idle;
    if (!activeAction) return;

    activeAction.reset().fadeIn(0.25).play();

    return () => {
      activeAction.fadeOut(0.25);
    };
  }, [actions, mood]);

  return (
    <group ref={group} position={[0, -1, 0]} rotation={[Math.PI, Math.PI - 0.25, Math.PI]} scale={1.7}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload(manifest.character.model);
animationOrder.forEach((key) => useGLTF.preload(manifest.animations[key]));
