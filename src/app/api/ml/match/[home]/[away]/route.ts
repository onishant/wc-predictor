import { NextResponse } from 'next/server';
import { getMatchPrediction } from '@/lib/ml-api';

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ home: string; away: string }> },
) {
  const { home, away } = await params;
  const prediction = await getMatchPrediction(
    decodeURIComponent(home),
    decodeURIComponent(away),
  );

  if (!prediction) {
    return NextResponse.json({ error: 'ML API unavailable' }, { status: 502 });
  }

  return NextResponse.json(prediction);
}
