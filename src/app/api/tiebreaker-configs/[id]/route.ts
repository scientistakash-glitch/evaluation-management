import { NextRequest, NextResponse } from 'next/server';
import { updateTiebreakerConfig } from '@/lib/data/tiebreakerConfigs';
import { readJson } from '@/lib/data/fileStore';
import { TiebreakerConfig } from '@/types';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const all = await readJson<TiebreakerConfig>('tiebreaker-configs.json');
    const config = all.find((t) => t.id === params.id);
    if (!config) return NextResponse.json({ error: 'Tiebreaker config not found' }, { status: 404 });
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tiebreaker config' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await updateTiebreakerConfig(params.id, body);
    if (!updated) return NextResponse.json({ error: 'Tiebreaker config not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update tiebreaker config' }, { status: 500 });
  }
}
