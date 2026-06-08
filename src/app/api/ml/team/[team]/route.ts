import { NextResponse } from 'next/server';
import { getTeamPrediction } from '@/lib/ml-api';

export const revalidate = 300;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ team: string }> },
) {
  const { team } = await params;
  const prediction = await getTeamPrediction(decodeURIComponent(team));

  if (!prediction) {
    return NextResponse.json({ error: 'ML API unavailable' }, { status: 502 });
  }

  return NextResponse.json(prediction);
}
