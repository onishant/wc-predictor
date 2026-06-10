import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-heading">
      <div className="max-w-md text-center">
        <p className="text-8xl font-bold text-cyan-500/30">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Looks like this ball went out of bounds. The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
          >
            Go home
          </Link>
          <Link
            href="/fixtures"
            className="rounded-full border border-border-default px-5 py-2.5 text-sm font-medium text-body hover:bg-surface-raised"
          >
            Fixtures
          </Link>
        </div>
      </div>
    </main>
  );
}
