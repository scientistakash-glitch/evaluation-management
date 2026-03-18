import { NextRequest, NextResponse } from 'next/server';
import { getAllCriteriaSets, createCriteriaSet } from '@/lib/data/criteriaSets';
import { validateWeightageSum } from '@/lib/utils/validators';

export async function GET() {
  try {
    const sets = await getAllCriteriaSets();
    return NextResponse.json(sets);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch criteria sets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, isCustom, criteria } = body;
    if (!name || !criteria || !Array.isArray(criteria)) {
      return NextResponse.json({ error: 'name and criteria are required' }, { status: 400 });
    }
    const weightageError = validateWeightageSum(criteria);
    if (weightageError) {
      return NextResponse.json({ error: weightageError }, { status: 400 });
    }
    const cs = await createCriteriaSet({ name, description, isCustom: isCustom ?? false, criteria });
    return NextResponse.json(cs, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create criteria set' }, { status: 500 });
  }
}
