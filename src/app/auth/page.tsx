import { AuthPanel } from '@/components/auth/auth-panel';

export default function AuthPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-md">
        <h1 className="mb-4 text-3xl font-bold">Auth</h1>
        <AuthPanel />
      </div>
    </main>
  );
}
