import { rebuildProgressFromSettledPredictions } from '@/lib/world-cup-sync';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || request.headers.get('authorization') !== `Bearer ${adminSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await rebuildProgressFromSettledPredictions();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
