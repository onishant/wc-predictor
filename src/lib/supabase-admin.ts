import 'server-only';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serverKey = serviceRoleKey ?? anonKey;

if (!supabaseUrl || !serverKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase server key.');
}

export const hasSupabaseServiceRole = Boolean(serviceRoleKey);

export const supabaseAdmin = createClient(supabaseUrl, serverKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
