export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent" />
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    </main>
  );
}
