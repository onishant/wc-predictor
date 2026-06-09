import { AppNav } from '@/components/app-nav';
import { AvatarComparisonLab } from '@/components/avatar/avatar-comparison-lab';

export default function AvatarComparePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 text-heading sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <AppNav />
        <header className="rounded-2xl border border-border-subtle bg-surface-overlay p-6 shadow-2xl shadow-accent/10 backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Avatar lab</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Find the avatar direction worth building.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-body">
            Compare the realistic web-avatar route, a clean CC0 fallback, and the current Mixamo pipeline under the same motion controls.
          </p>
        </header>
        <AvatarComparisonLab />
      </div>
    </main>
  );
}
