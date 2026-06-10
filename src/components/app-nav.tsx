'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserProfileCard } from '@/components/user-profile-card';
import { supabase } from '@/lib/supabase-browser';

export function AppNav() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !supabase) return;
      setEmail(user.email ?? null);
      const { data: profile } = await supabase
        .from('users_profile')
        .select('username')
        .eq('id', user.id)
        .single();
      setUsername((profile as { username: string | null } | null)?.username ?? null);
    });
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  async function handleSignOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.replace('/auth');
  }

  const displayName = username ?? email ?? 'User';

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
      <Link href="/" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Home
      </Link>
      <Link href="/fixtures" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Fixtures
      </Link>
      <Link href="/teams" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Teams
      </Link>
      <Link href="/leaderboard" className="rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent">
        Leaderboard
      </Link>
      <Link href="/predictions" className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-purple-300 hover:border-purple-400 hover:text-purple-200">
        🤖 ML
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2 text-body hover:border-accent hover:text-accent"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">
              {displayName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden sm:inline max-w-[100px] truncate">{displayName}</span>
            <svg className="h-3 w-3 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-xl border border-border-subtle bg-surface shadow-xl">
              <UserProfileCard onClose={() => setMenuOpen(false)} />
              <div className="border-t border-border-subtle" />
              <div className="p-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
