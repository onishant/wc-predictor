import { Suspense } from 'react';
import Image from 'next/image';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-heading">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-cyan-500/3 blur-3xl" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(34,211,238,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Floating football - top right */}
        <div className="absolute right-12 top-16 hidden lg:block" style={{ animation: 'float 6s ease-in-out infinite' }}>
          <Image src="/images/football.svg" alt="" width={80} height={80} className="h-20 w-20 opacity-40" />
        </div>
        {/* Floating trophy - bottom left */}
        <div className="absolute bottom-20 left-12 hidden lg:block" style={{ animation: 'float 6s ease-in-out infinite 1.5s' }}>
          <Image src="/images/trophy.svg" alt="" width={72} height={72} className="h-18 w-18 opacity-35" />
        </div>
        {/* Small floating football - left mid */}
        <div className="absolute left-8 top-1/2 hidden lg:block" style={{ animation: 'float 5s ease-in-out infinite 3s' }}>
          <Image src="/images/football.svg" alt="" width={36} height={36} className="h-9 w-9 opacity-20" />
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 lg:flex-row lg:gap-16">
        {/* Hero section */}
        <div className="flex-1 text-center lg:text-left">
          {/* Trophy + heading combo */}
          <div className="mb-4 flex items-center justify-center gap-4 lg:justify-start">
            <Image
              src="/images/trophy.svg"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 hidden sm:block"
              priority
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">FIFA World Cup 2026</p>
              <h1 className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Predict.{' '}
                <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Score.
                </span>{' '}
                Climb.
              </h1>
            </div>
          </div>

          <p className="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base">
            Make your predictions for every World Cup match. Earn points for correct results.
            Compete with friends on group leaderboards.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <Image src="/images/football.svg" alt="" width={32} height={32} className="mx-auto h-8 w-8" />
              <p className="mt-1 text-xs font-medium text-muted">Predict matches</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <p className="text-2xl">📊</p>
              <p className="mt-1 text-xs font-medium text-muted">ML-powered stats</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <Image src="/images/trophy.svg" alt="" width={32} height={32} className="mx-auto h-8 w-8" />
              <p className="mt-1 text-xs font-medium text-muted">Group leaderboards</p>
            </div>
          </div>
        </div>

        {/* Auth form */}
        <div className="w-full max-w-md flex-shrink-0">
          <div className="rounded-3xl border border-border-subtle bg-surface/80 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl sm:p-8">
            <Suspense fallback={
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              </div>
            }>
              <AuthPanel />
            </Suspense>
          </div>
        </div>
      </div>

      {/* Float animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-16px) rotate(3deg); }
        }
      `}</style>
    </main>
  );
}
