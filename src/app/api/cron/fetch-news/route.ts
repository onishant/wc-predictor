import { NextResponse } from 'next/server';
import { fetchAndStoreNews } from '@/lib/news';

export const maxDuration = 30;

export async function GET() {
  try {
    const result = await fetchAndStoreNews();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[cron/fetch-news]', error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
