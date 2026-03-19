import { NextRequest, NextResponse } from 'next/server';
import { getAllLpps, createLpp } from '@/lib/data/lpps';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ptatId = searchParams.get('ptatId') ?? undefined;
    const lpps = await getAllLpps(ptatId);
    return NextResponse.json(lpps);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch LPPs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ptatId, name, code, duration, description, totalSeats, categoryWiseSeats } = body;
    if (!ptatId || !name || !code || duration == null) {
      return NextResponse.json({ error: 'ptatId, name, code, and duration are required' }, { status: 400 });
    }
    const lpp = await createLpp({ ptatId, name, code, duration, description, totalSeats: totalSeats ?? 0, categoryWiseSeats: categoryWiseSeats ?? {} });
    return NextResponse.json(lpp, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create LPP' }, { status: 500 });
  }
}
