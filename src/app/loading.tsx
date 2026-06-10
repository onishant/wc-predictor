import Image from 'next/image';

export default function Loading() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Hero image background */}
      <Image
        src="/images/wc-heroes.png"
        alt=""
        fill
        className="object-cover object-center opacity-10"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-cyan-500 border-t-transparent" />
        <p className="text-sm font-medium text-muted">Loading…</p>
      </div>
    </main>
  );
}
