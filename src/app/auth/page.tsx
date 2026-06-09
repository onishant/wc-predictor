import { Suspense } from 'react';
import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-12 text-heading">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-3xl font-bold">Auth</h1>
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
          <AuthPanel />
        </Suspense>
      </div>
    </main>
  );
}
