import { NextRequest, NextResponse } from 'next/server';
import { getApplicationById } from '@/lib/data/applications';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const application = await getApplicationById(params.id);
    if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    return NextResponse.json(application);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch application' }, { status: 500 });
  }
}
