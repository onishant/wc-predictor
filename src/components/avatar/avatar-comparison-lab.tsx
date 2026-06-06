'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, useAnimations, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Group } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MixamoCharacterStage } from '@/components/characters/mixamo-character-stage';
import type { AvatarId } from '@/lib/avatar-catalog';
import type { CharacterMood } from '@/lib/character-progress';

type MotionId = 'idle' | 'run' | 'celebrate' | 'keeper';

const readyPlayerMeAvatar = '/assets/characters/readyplayerme/RPM_Masculine_TPose.glb';

const readyPlayerMeAnimations = {
  idle: '/assets/characters/readyplayerme/RPM_M_Standing_Idle_001.glb',
  run: '/assets/characters/readyplayerme/RPM_M_Run_001.glb',
  celebrate: '/assets/characters/readyplayerme/RPM_M_Standing_Expressions_012.glb',
  keeper: '/assets/characters/readyplayerme/RPM_M_Jog_001.glb',
} satisfies Record<MotionId, string>;

const quaterniusModel = '/assets/characters/quaternius/Quaternius_UAL2_Standard.glb';

const motionOptions: Array<{
  id: MotionId;
  label: string;
  mixamoMood: CharacterMood;
  mixamoAvatar: AvatarId;
  quaterniusClip: string;
}> = [
  { id: 'idle', label: 'Idle', mixamoMood: 'idle', mixamoAvatar: 'playmaker', quaterniusClip: 'Idle_FoldArms_Loop' },
  { id: 'run', label: 'Run', mixamoMood: 'jogging', mixamoAvatar: 'winger', quaterniusClip: 'Walk_Carry_Loop' },
  { id: 'celebrate', label: 'Celebrate', mixamoMood: 'victory', mixamoAvatar: 'footballer', quaterniusClip: 'Yes' },
  { id: 'keeper', label: 'Keeper', mixamoMood: 'goalkeeperCatchHigh', mixamoAvatar: 'keeper', quaterniusClip: 'Slide_Loop' },
];

const candidateSummaries = [
  {
    name: 'Ready Player Me',
    verdict: 'Best visual ceiling',
    license: 'Animation library sample is local for this lab. Real player avatars still need the Ready Player Me developer setup.',
    speed: 'Local 2.6 MB body plus tiny motion clips. Real RPM avatars also support LOD and texture atlas options.',
    risk: 'The visible lab model proves the RPM skeleton/motion path, not the final footballer styling.',
  },
  {
    name: 'Quaternius CC0',
    verdict: 'Fastest clean-license fallback',
    license: 'CC0. Safe for personal, educational, and commercial use.',
    speed: 'Local 7.7 MB bundled GLB with many animations. No login, no external CDN.',
    risk: 'Stylized, not realistic football-player quality.',
  },
  {
    name: 'Curated Mixamo',
    verdict: 'Closest to our current code',
    license: 'Adobe says Mixamo characters and animations are royalty-free for games/projects.',
    speed: 'Already optimized locally. Current bodies are small after glTF compression.',
    risk: 'Asset quality and sports motion still feel uneven unless we curate hard.',
  },
];

export function AvatarComparisonLab() {
  const [motion, setMotion] = useState<MotionId>('run');
  const currentMotion = motionOptions.find((item) => item.id === motion) ?? motionOptions[0];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Avatar comparison</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-50">Pick the direction by looking at motion, not promises.</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {motionOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => setMotion(option.id)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
                motion === option.id
                  ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                  : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-cyan-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <CandidateCard
          title="A. Premium Web Avatar"
          badge="Ready Player Me"
          verdict="Best visual ceiling"
          notes={['Local RPM rig sample', 'RPM mocap library', '2.6 MB body']}
          source="readyplayerme/animation-library"
        >
          <RpmStage motion={motion} />
        </CandidateCard>

        <CandidateCard
          title="B. Clean Free Asset Pack"
          badge="Quaternius CC0"
          verdict="Fastest safe fallback"
          notes={['Local GLB', '43 bundled clips', 'No attribution required']}
          source="Quaternius Universal Animation Library 2"
        >
          <QuaterniusStage clipName={currentMotion.quaterniusClip} />
        </CandidateCard>

        <CandidateCard
          title="C. Current Pipeline"
          badge="Curated Mixamo"
          verdict="Most practical today"
          notes={['Local optimized bodies', 'Football prop', 'Known integration path']}
          source="Adobe Mixamo + our existing converter"
        >
          <MixamoCharacterStage
            mood={currentMotion.mixamoMood}
            avatarId={currentMotion.mixamoAvatar}
            featureId="football"
            height="lg"
            label={`${currentMotion.label} test`}
            framing="wide"
          />
        </CandidateCard>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {candidateSummaries.map((candidate) => (
          <article key={candidate.name} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-semibold text-cyan-300">{candidate.name}</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-50">{candidate.verdict}</h3>
            <dl className="mt-4 space-y-3 text-sm leading-6">
              <SummaryItem label="License" value={candidate.license} />
              <SummaryItem label="Speed" value={candidate.speed} />
              <SummaryItem label="Risk" value={candidate.risk} />
            </dl>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-200">Recommendation</p>
        <p className="mt-2 max-w-4xl text-lg leading-8 text-slate-100">
          If the Ready Player Me preview feels good, use it as the main avatar system and dress it like a footballer.
          Keep Mixamo only as a backup. If you want zero license ambiguity and instant loading, Quaternius is the fallback,
          but it will make the app feel more stylized than premium football.
        </p>
      </section>
    </div>
  );
}

function CandidateCard({
  title,
  badge,
  verdict,
  notes,
  source,
  children,
}: {
  title: string;
  badge: string;
  verdict: string;
  notes: string[];
  source: string;
  children: ReactNode;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/30">
      {children}
      <div className="space-y-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">{badge}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-50">{title}</h3>
          <p className="mt-1 text-sm font-semibold text-emerald-300">{verdict}</p>
        </div>
        <div className="grid gap-2">
          {notes.map((note) => (
            <p key={note} className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
              {note}
            </p>
          ))}
        </div>
        <p className="text-xs leading-5 text-slate-500">{source}</p>
      </div>
    </article>
  );
}

function RpmStage({ motion }: { motion: MotionId }) {
  return (
    <StageShell label="RPM local GLB">
      <Canvas camera={{ position: [0, 1.2, 4.6], fov: 34 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <StadiumLights />
          <RpmModel motion={motion} />
          <PitchMarks />
          <ContactShadows position={[0, -1.2, 0]} opacity={0.34} scale={4.6} blur={2.2} far={2} />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </StageShell>
  );
}

function RpmModel({ motion }: { motion: MotionId }) {
  const group = useRef<Group>(null);
  const avatar = useGLTF(readyPlayerMeAvatar);
  const idle = useGLTF(readyPlayerMeAnimations.idle);
  const run = useGLTF(readyPlayerMeAnimations.run);
  const celebrate = useGLTF(readyPlayerMeAnimations.celebrate);
  const keeper = useGLTF(readyPlayerMeAnimations.keeper);
  const scene = useMemo(() => clone(avatar.scene), [avatar.scene]);
  const clips = useMemo(
    () =>
      [
        { key: 'idle', asset: idle },
        { key: 'run', asset: run },
        { key: 'celebrate', asset: celebrate },
        { key: 'keeper', asset: keeper },
      ].flatMap(({ key, asset }) =>
        asset.animations.map((clip) => {
          const nextClip = clip.clone();
          nextClip.name = key;
          return nextClip;
        }),
      ),
    [celebrate, idle, keeper, run],
  );
  const { actions } = useAnimations(clips, group);

  useEffect(() => {
    const action = actions[motion] ?? actions.idle;
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, motion]);

  return (
    <group ref={group} position={[0, -1.08, 0]} rotation={[0, -0.2, 0]} scale={1.28}>
      <primitive object={scene} />
      <FootballOrbit motion={motion} accent="#22d3ee" />
    </group>
  );
}

function QuaterniusStage({ clipName }: { clipName: string }) {
  return (
    <StageShell label="CC0 local GLB">
      <Canvas camera={{ position: [0, 1.05, 5.2], fov: 32 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
        <Suspense fallback={null}>
          <StadiumLights />
          <QuaterniusModel clipName={clipName} />
          <PitchMarks />
          <ContactShadows position={[0, -1.18, 0]} opacity={0.36} scale={4.6} blur={2.2} far={2} />
          <Environment preset="warehouse" />
        </Suspense>
      </Canvas>
    </StageShell>
  );
}

function QuaterniusModel({ clipName }: { clipName: string }) {
  const group = useRef<Group>(null);
  const gltf = useGLTF(quaterniusModel);
  const scene = useMemo(() => clone(gltf.scene), [gltf.scene]);
  const { actions } = useAnimations(gltf.animations, group);

  useEffect(() => {
    const action = actions[clipName] ?? actions.Idle_FoldArms_Loop ?? actions.A_TPose;
    if (!action) return;
    action.reset().fadeIn(0.2).play();
    return () => {
      action.fadeOut(0.2);
    };
  }, [actions, clipName]);

  return (
    <group ref={group} position={[0, -1.08, 0]} rotation={[0, -0.22, 0]} scale={1.5}>
      <primitive object={scene} />
      <FootballOrbit motion="run" accent="#f59e0b" />
    </group>
  );
}

function StageShell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="relative h-80 overflow-hidden bg-slate-950">
      {children}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-200 backdrop-blur">
        {label}
      </div>
    </div>
  );
}

function StadiumLights() {
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[2.5, 4.2, 3]} intensity={2.5} />
      <pointLight position={[-2.5, 2.8, 1.4]} intensity={1.2} color="#22d3ee" />
      <pointLight position={[2.2, 2.4, -1.8]} intensity={0.8} color="#f59e0b" />
    </>
  );
}

function PitchMarks() {
  return (
    <group position={[0, -1.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh>
        <circleGeometry args={[1.05, 80]} />
        <meshStandardMaterial color="#134e4a" roughness={0.92} />
      </mesh>
      <mesh position={[0, 0, 0.006]}>
        <ringGeometry args={[0.58, 0.6, 80]} />
        <meshStandardMaterial color="#d1fae5" transparent opacity={0.48} />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <planeGeometry args={[2.1, 0.025]} />
        <meshStandardMaterial color="#d1fae5" transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function FootballOrbit({ motion, accent }: { motion: MotionId; accent: string }) {
  const ball = useRef<Group>(null);

  useFrame(({ clock }) => {
    if (!ball.current) return;
    const t = clock.getElapsedTime();
    if (motion === 'celebrate') {
      ball.current.position.set(-0.48 + Math.sin(t * 2) * 0.18, 0.1 + Math.abs(Math.sin(t * 3)) * 0.36, 0.4);
    } else if (motion === 'keeper') {
      ball.current.position.set(0.34 + Math.sin(t * 4) * 0.08, 0.74 + Math.cos(t * 3) * 0.08, 0.35);
    } else if (motion === 'run') {
      ball.current.position.set(0.55 + Math.sin(t * 4) * 0.2, -0.82 + Math.abs(Math.sin(t * 4)) * 0.16, 0.32);
    } else {
      ball.current.position.set(0.58, -0.82 + Math.sin(t * 1.7) * 0.03, 0.32);
    }
    ball.current.rotation.set(t * 2.6, t * 1.1, t * 0.4);
  });

  return (
    <group ref={ball} scale={0.16}>
      <mesh>
        <sphereGeometry args={[1, 28, 28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.42} />
      </mesh>
      <mesh rotation={[0.7, 0.35, 0]}>
        <icosahedronGeometry args={[1.015, 1]} />
        <meshStandardMaterial color="#020617" wireframe />
      </mesh>
      <mesh position={[0, 0, 0.99]}>
        <circleGeometry args={[0.24, 6]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-slate-200">{label}</dt>
      <dd className="mt-1 text-slate-400">{value}</dd>
    </div>
  );
}

if (typeof window !== 'undefined') {
  useGLTF.preload(readyPlayerMeAvatar);
  Object.values(readyPlayerMeAnimations).forEach((url) => useGLTF.preload(url));
  useGLTF.preload(quaterniusModel);
}
