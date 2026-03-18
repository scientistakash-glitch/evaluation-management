import { NextRequest, NextResponse } from 'next/server';
import { getAllPtats, createPtat } from '@/lib/data/ptats';

export async function GET() {
  try {
    const ptats = await getAllPtats();
    return NextResponse.json(ptats);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch PTATs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, code, description } = body;
    if (!name || !code) {
      return NextResponse.json({ error: 'name and code are required' }, { status: 400 });
    }
    const ptat = await createPtat({ name, code, description });
    return NextResponse.json(ptat, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create PTAT' }, { status: 500 });
  }
}
