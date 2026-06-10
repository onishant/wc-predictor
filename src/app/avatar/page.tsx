import { AppNav } from '@/components/app-nav';
import { AvatarConfiguratorSimple } from '@/components/avatar/avatar-configurator-simple';

export default function AvatarPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <AppNav />
        <header className="rounded-[28px] border border-border-subtle bg-surface-overlay p-6 shadow-2xl backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Profile</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Your team.</h1>
          <p className="mt-3 text-sm leading-6 text-body">
            Pick your supported team. Their crest will appear on your leaderboard avatar.
          </p>
        </header>
        <AvatarConfiguratorSimple />
      </div>
    </main>
  );
}
