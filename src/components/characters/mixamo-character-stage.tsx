'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import type { Group, Object3D } from 'three';
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
  framing?: 'default' | 'wide';
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
  framing = 'default',
}: MixamoCharacterStageProps) {
  const accent = getAvatarAccent(avatarId);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 [&_canvas]:!h-full [&_canvas]:!w-full ${heightClass[height]}`}>
      <Canvas
        camera={{ position: [0, 1.35, 8], fov: 32 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ height: '100%', width: '100%' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.35} />
          <directionalLight position={[3, 4, 3]} intensity={2.4} />
          <CharacterModel mood={mood} avatarId={avatarId} accent={accent} featureId={featureId} framing={framing} />
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
  framing,
}: {
  mood: CharacterMood;
  avatarId: AvatarId;
  accent: string;
  featureId: AvatarFeatureId;
  framing: NonNullable<MixamoCharacterStageProps['framing']>;
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

  const scene = useMemo(() => normalizeMixamoRigNames(clone(character.scene)), [character.scene]);
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
            anchorHipsToStage(namedClip);
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
    <group ref={group} position={[framing === 'wide' ? -0.15 : 0, -1, 0]} rotation={[Math.PI, Math.PI - 0.25, Math.PI]} scale={framing === 'wide' ? 1.22 : 1.7}>
      <primitive object={scene} />
      <AvatarIdentityKit avatarId={avatarId} accent={accent} />
      <AvatarFeature featureId={featureId} accent={accent} />
      {(featureId === 'football' || avatarHasBuiltInFootball(avatarId)) && <FootballProp mood={mood} accent={accent} />}
    </group>
  );
}

function normalizeMixamoRigNames(scene: Object3D) {
  scene.traverse((object) => {
    // GLTFLoader strips ':' from node names, so normalize both raw and sanitized Mixamo prefixes.
    object.name = object.name
      .replace(/^mixamorig\d+:/, 'mixamorig:')
      .replace(/^mixamorig\d+(?=[A-Z])/, 'mixamorig');
  });

  return scene;
}

function anchorHipsToStage(clip: { tracks: Array<{ name: string; values: { length: number; [index: number]: number } }> }) {
  clip.tracks.forEach((track) => {
    if (!track.name.endsWith('Hips.position')) return;
    const values = track.values;
    const originX = values[0] ?? 0;
    const originZ = values[2] ?? 0;

    for (let index = 0; index < values.length; index += 3) {
      values[index] = originX;
      values[index + 2] = originZ;
    }
  });
}

function AvatarIdentityKit({ avatarId, accent }: { avatarId: AvatarId; accent: string }) {
  if (avatarId === 'striker') {
    return (
      <group>
        <BootPair accent={accent} />
        <mesh position={[0.02, 0.08, -0.28]} rotation={[0.18, 0, -0.32]}>
          <boxGeometry args={[0.16, 0.72, 0.035]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'keeper') {
    return (
      <group>
        <KeeperGloves accent={accent} />
        <mesh position={[0, 0.98, -0.08]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.28, 0.028, 10, 40]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'captain') {
    return (
      <group>
        <mesh position={[0.43, 0.58, -0.03]} rotation={[0.2, 0.2, 0.15]}>
          <boxGeometry args={[0.24, 0.09, 0.045]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.65} />
        </mesh>
        <mesh position={[0, -0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.66, 0.026, 12, 64]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'footballer') {
    return (
      <group>
        <BootPair accent={accent} />
        <mesh position={[-0.34, 0.46, -0.05]} rotation={[0.15, 0, -0.2]}>
          <boxGeometry args={[0.18, 0.08, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'playmaker') {
    return (
      <group>
        <mesh position={[0, 0.18, -0.27]} rotation={[0.18, 0, 0.58]}>
          <boxGeometry args={[0.14, 0.82, 0.04]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.4} />
        </mesh>
        <mesh position={[0, -0.62, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.02, 10, 50]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'winger') {
    return (
      <group>
        <BootPair accent={accent} />
        <mesh position={[-0.72, -0.12, 0]} rotation={[0, 0.1, Math.PI / 2]}>
          <coneGeometry args={[0.08, 0.5, 3]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.75} transparent opacity={0.72} />
        </mesh>
        <mesh position={[-0.92, -0.38, 0.02]} rotation={[0, 0.1, Math.PI / 2]}>
          <coneGeometry args={[0.06, 0.36, 3]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} transparent opacity={0.62} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'defender') {
    return (
      <group>
        <mesh position={[-0.36, 0.47, -0.02]} rotation={[0.1, 0, -0.25]}>
          <boxGeometry args={[0.22, 0.14, 0.08]} />
          <meshStandardMaterial color={accent} roughness={0.35} />
        </mesh>
        <mesh position={[0.36, 0.47, -0.02]} rotation={[0.1, 0, 0.25]}>
          <boxGeometry args={[0.22, 0.14, 0.08]} />
          <meshStandardMaterial color={accent} roughness={0.35} />
        </mesh>
        <mesh position={[0, -0.46, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.03, 12, 60]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.38} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'sweeper') {
    return (
      <group>
        <KeeperGloves accent={accent} />
        <mesh position={[0, 0.82, -0.22]}>
          <boxGeometry args={[0.46, 0.06, 0.045]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
        </mesh>
      </group>
    );
  }

  if (avatarId === 'finisher') {
    return (
      <group>
        <BootPair accent={accent} />
        <mesh position={[0.42, 0.78, -0.08]} rotation={[0.2, 0.1, 0.2]}>
          <octahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.95} />
        </mesh>
        <mesh position={[0, -0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.018, 10, 72]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} />
        </mesh>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 1.04, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.31, 0.025, 10, 48]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.85} />
      </mesh>
      <mesh position={[0.62, 0.38, -0.08]} rotation={[0.1, 0.1, 0.82]}>
        <cylinderGeometry args={[0.025, 0.025, 0.55, 12]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
}

function BootPair({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[-0.18, -0.92, -0.04]} rotation={[0, 0.1, -0.05]}>
        <boxGeometry args={[0.22, 0.08, 0.09]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.42} />
      </mesh>
      <mesh position={[0.2, -0.92, -0.04]} rotation={[0, -0.1, 0.05]}>
        <boxGeometry args={[0.22, 0.08, 0.09]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.42} />
      </mesh>
    </group>
  );
}

function KeeperGloves({ accent }: { accent: string }) {
  return (
    <group>
      <mesh position={[-0.46, 0.25, -0.08]} scale={[1.2, 0.75, 0.8]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.38} />
      </mesh>
      <mesh position={[0.46, 0.25, -0.08]} scale={[1.2, 0.75, 0.8]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.38} />
      </mesh>
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
