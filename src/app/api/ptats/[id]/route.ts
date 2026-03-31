import { NextRequest, NextResponse } from 'next/server';
import { getPtatById, updatePtat, removePtat } from '@/lib/data/ptats';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ptat = await getPtatById(params.id);
    if (!ptat) return NextResponse.json({ error: 'PTAT not found' }, { status: 404 });
    return NextResponse.json(ptat);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch PTAT' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await updatePtat(params.id, body);
    if (!updated) return NextResponse.json({ error: 'PTAT not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update PTAT' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const removed = await removePtat(params.id);
    if (!removed) return NextResponse.json({ error: 'PTAT not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete PTAT' }, { status: 500 });
  }
}
