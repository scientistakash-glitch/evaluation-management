import { NextRequest, NextResponse } from 'next/server';
import { getLppById, updateLpp, removeLpp } from '@/lib/data/lpps';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lpp = await getLppById(params.id);
    if (!lpp) return NextResponse.json({ error: 'LPP not found' }, { status: 404 });
    return NextResponse.json(lpp);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch LPP' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const updated = await updateLpp(params.id, body);
    if (!updated) return NextResponse.json({ error: 'LPP not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update LPP' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const removed = await removeLpp(params.id);
    if (!removed) return NextResponse.json({ error: 'LPP not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete LPP' }, { status: 500 });
  }
}
