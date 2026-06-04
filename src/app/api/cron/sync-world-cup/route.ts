import { revalidatePath } from 'next/cache';
import { syncWorldCup } from '@/lib/world-cup-sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncWorldCup();
    revalidatePath('/fixtures');
    revalidatePath('/teams');
    revalidatePath('/teams/[id]', 'page');
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error';
    console.error('[cron/sync-world-cup]', error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
