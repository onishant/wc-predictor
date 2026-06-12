import { revalidatePath } from 'next/cache';
import { syncLiveScores } from '@/lib/world-cup-sync';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncLiveScores();

    // Revalidate pages only if something actually changed
    if (result.changed > 0) {
      revalidatePath('/fixtures');
      revalidatePath('/leaderboard');
    }

    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/live-scores]', error);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
