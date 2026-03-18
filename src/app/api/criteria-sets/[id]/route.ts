import { NextRequest, NextResponse } from 'next/server';
import { getCriteriaSetById, updateCriteriaSet, removeCriteriaSet } from '@/lib/data/criteriaSets';
import { validateWeightageSum } from '@/lib/utils/validators';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cs = await getCriteriaSetById(params.id);
    if (!cs) return NextResponse.json({ error: 'Criteria set not found' }, { status: 404 });
    return NextResponse.json(cs);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch criteria set' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    if (body.criteria) {
      const weightageError = validateWeightageSum(body.criteria);
      if (weightageError) {
        return NextResponse.json({ error: weightageError }, { status: 400 });
      }
    }
    const updated = await updateCriteriaSet(params.id, body);
    if (!updated) return NextResponse.json({ error: 'Criteria set not found' }, { status: 404 });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed to update criteria set' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const removed = await removeCriteriaSet(params.id);
    if (!removed) return NextResponse.json({ error: 'Criteria set not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to delete criteria set' }, { status: 500 });
  }
}
