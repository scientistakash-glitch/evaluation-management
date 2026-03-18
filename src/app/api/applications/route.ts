import { NextRequest, NextResponse } from 'next/server';
import { getAllApplications } from '@/lib/data/applications';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') ?? undefined;
    const applications = await getAllApplications(search);
    return NextResponse.json(applications);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
