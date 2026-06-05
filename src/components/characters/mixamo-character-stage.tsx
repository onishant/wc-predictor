'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { AVATAR_ARCHETYPES, avatarHasBuiltInFootball, getAvatarAccent, getAvatarModel } from '@/lib/avatar-catalog';
import type { AvatarFeatureId, AvatarId } from '@/lib/avatar-catalog';
import type { CharacterMood } from '@/lib/character-progress';
import manifest from '../../../public/assets/characters/mixamo/manifest.json';

type MixamoCharacterStageProps = {
  mood?: CharacterMood;
  avatarId?: AvatarId;
  featureId?: AvatarFeatureId;
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
  avatarId = 'striker',
  featureId = 'none',
  height = 'md',
  label = manifest.character.name,
}: MixamoCharacterStageProps) {
  const accent = getAvatarAccent(avatarId);

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
          <CharacterModel mood={mood} avatarId={avatarId} accent={accent} featureId={featureId} />
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

function CharacterModel({
  mood,
  avatarId,
  accent,
  featureId,
}: {
  mood: CharacterMood;
  avatarId: AvatarId;
  accent: string;
  featureId: AvatarFeatureId;
}) {
  const group = useRef<Group>(null);
  const character = useGLTF(getAvatarModel(avatarId));
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
      <AvatarFeature featureId={featureId} accent={accent} />
      {(featureId === 'football' || avatarHasBuiltInFootball(avatarId)) && <FootballProp mood={mood} accent={accent} />}
    </group>
  );
}

function AvatarFeature({ featureId, accent }: { featureId: AvatarFeatureId; accent: string }) {
  if (featureId === 'none' || featureId === 'football') return null;

  return (
    <group>
      {(featureId === 'clubAura' || featureId === 'championGlow') && (
        <mesh position={[0, -0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.035, 16, 80]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={featureId === 'championGlow' ? 1.8 : 0.8} />
        </mesh>
      )}
      {(featureId === 'captainBand' || featureId === 'championGlow') && (
        <mesh position={[0.43, 0.58, -0.03]} rotation={[0.2, 0.2, 0.15]}>
          <boxGeometry args={[0.22, 0.08, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      )}
    </group>
  );
}

function FootballProp({ mood, accent }: { mood: CharacterMood; accent: string }) {
  const ball = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ball.current) return;

    const t = clock.getElapsedTime();
    const phase = t % 2;

    if (mood === 'goalkeeperCatchHigh') {
      ball.current.position.set(0.2, 1.1 + Math.sin(t * 4) * 0.03, -0.1);
      ball.current.rotation.set(t * 1.2, t * 0.4, 0);
      return;
    }

    if (mood === 'goalkeeperCatchMedium') {
      ball.current.position.set(0.26, 0.58 + Math.sin(t * 4) * 0.02, -0.16);
      ball.current.rotation.set(t * 1.1, 0, t * 0.35);
      return;
    }

    if (mood === 'jogging') {
      const kick = Math.sin(t * 3);
      ball.current.position.set(0.55 + kick * 0.18, -0.78 + Math.max(0, kick) * 0.12, -0.08);
      ball.current.rotation.set(t * 3.5, t * 1.2, 0);
      return;
    }

    if (mood === 'victory') {
      const bounce = Math.abs(Math.sin(t * 3.4));
      ball.current.position.set(-0.58 + Math.sin(t * 1.4) * 0.12, -0.7 + bounce * 0.32, -0.08);
      ball.current.rotation.set(t * 2.6, t * 0.7, t * 0.4);
      return;
    }

    if (mood === 'excited') {
      ball.current.position.set(-0.52 + Math.sin(t * 2.2) * 0.1, -0.73 + Math.abs(Math.sin(t * 2.2)) * 0.16, -0.08);
      ball.current.rotation.set(t * 2, t * 0.8, 0);
      return;
    }

    if (mood === 'defeat') {
      ball.current.position.set(-0.7 + phase * 0.18, -0.82, -0.08);
      ball.current.rotation.set(t * 1.4, 0, t * 0.5);
      return;
    }

    ball.current.position.set(0.55, -0.78 + Math.sin(t * 1.6) * 0.03, -0.08);
    ball.current.rotation.set(t * 0.9, t * 0.4, 0);
  });

  return (
    <group ref={ball} scale={0.28}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.42} />
      </mesh>
      <mesh rotation={[0.72, 0.4, 0]}>
        <icosahedronGeometry args={[1.012, 1]} />
        <meshStandardMaterial color="#020617" wireframe roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.98]}>
        <circleGeometry args={[0.22, 6]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

AVATAR_ARCHETYPES.forEach((avatar) => useGLTF.preload(avatar.modelPath));
animationOrder.forEach((key) => useGLTF.preload(manifest.animations[key]));
