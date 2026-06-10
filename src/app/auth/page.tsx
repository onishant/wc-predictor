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
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-8 lg:flex-row lg:gap-16">
        {/* Hero section */}
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-2">
            <Image
              src="/images/wc2026-emblem.png"
              alt="FIFA World Cup 2026"
              width={36}
              height={36}
              className="h-9 w-9"
              priority
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">FIFA World Cup 2026</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Predict.{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Score.
            </span>{' '}
            Climb.
          </h1>

          <p className="mt-4 max-w-md text-sm leading-6 text-muted sm:text-base">
            Make your predictions for every World Cup match. Earn points for correct results.
            Compete with friends on group leaderboards.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <p className="text-2xl">⚽</p>
              <p className="mt-1 text-xs font-medium text-muted">Predict matches</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <p className="text-2xl">📊</p>
              <p className="mt-1 text-xs font-medium text-muted">ML-powered stats</p>
            </div>
            <div className="rounded-2xl border border-border-subtle bg-surface/60 p-3 text-center backdrop-blur">
              <p className="text-2xl">🏅</p>
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
    </main>
  );
}
