import { NextRequest, NextResponse } from 'next/server';
import { getOfferReleaseByCycleId, createOfferRelease } from '@/lib/data/offerReleases';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const release = await getOfferReleaseByCycleId(params.id);
    return NextResponse.json(release);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch offer release' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { configRows, summary, studentResults } = body;
    if (!configRows || !summary) {
      return NextResponse.json({ error: 'configRows and summary are required' }, { status: 400 });
    }
    const release = await createOfferRelease({
      cycleId: params.id,
      configRows,
      summary,
      studentResults: studentResults ?? [],
    });
    return NextResponse.json(release, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save offer release' }, { status: 500 });
  }
}
