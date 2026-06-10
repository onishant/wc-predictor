import { Suspense } from 'react';
import Image from 'next/image';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12 text-heading">
      {/* Hero image background — faded and blended */}
      <div className="pointer-events-none absolute inset-0">
        <Image
          src="/images/wc-heroes.png"
          alt=""
          fill
          className="object-cover object-center opacity-[0.12]"
          priority
          sizes="100vw"
        />
        {/* Gradient overlays to blend edges */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
        {/* Accent glows */}
        <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-cyan-500/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-5xl flex-col items-center gap-8 lg:flex-row lg:gap-12">
        {/* Left: Hero image prominent */}
        <div className="flex-1 text-center lg:text-left">
          {/* Hero image card */}
          <div className="relative mb-6 overflow-hidden rounded-3xl border border-border-subtle shadow-2xl shadow-cyan-950/30">
            <Image
              src="/images/wc-heroes.png"
              alt="Iconic World Cup moments — Ronaldo, Pirlo, Iniesta, Maradona, Mbappé, Messi"
              width={800}
              height={450}
              className="w-full"
              priority
            />
            {/* Bottom fade */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">FIFA World Cup 2026</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
            Predict.{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Score.
            </span>{' '}
            Climb.
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted">
            Make your predictions for every World Cup match. Earn points. Compete with friends.
          </p>
        </div>

        {/* Right: Auth form */}
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
