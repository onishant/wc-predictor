import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ matchId: string }> },
) {
  const { matchId } = await params;

  if (!matchId) {
    return NextResponse.json({ error: 'matchId required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('community_insights')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
