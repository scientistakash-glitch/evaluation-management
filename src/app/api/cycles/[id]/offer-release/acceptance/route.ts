import { NextRequest, NextResponse } from 'next/server';
import { updateOfferReleaseAcceptance } from '@/lib/data/offerReleases';
export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { updates } = body;
    if (!Array.isArray(updates)) {
      return NextResponse.json({ error: 'updates must be an array' }, { status: 400 });
    }
    const result = await updateOfferReleaseAcceptance(params.id, updates);
    if (!result) return NextResponse.json({ error: 'Offer release not found' }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Failed to update acceptance statuses' }, { status: 500 });
  }
}
