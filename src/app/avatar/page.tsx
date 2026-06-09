import { AppNav } from '@/components/app-nav';
import { AvatarConfigurator } from '@/components/avatar/avatar-configurator';

export default function AvatarPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6 shadow-2xl shadow-accent/10 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Avatar workshop</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Build your prediction character.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-body">
            Pick your starter avatar, spend XP from correct predictions, and equip the gesture or feature that appears on the leaderboard.
          </p>
        </header>

        <AvatarConfigurator />
      </div>
    </main>
  );
}
