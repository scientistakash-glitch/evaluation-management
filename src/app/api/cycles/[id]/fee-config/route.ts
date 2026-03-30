import { NextRequest, NextResponse } from 'next/server';
import { getFeeConfigByCycleId, upsertFeeConfig } from '@/lib/data/feeConfigs';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const config = await getFeeConfigByCycleId(params.id);
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch fee config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { installmentPlanId, installmentRows } = body;
    if (!installmentPlanId || !Array.isArray(installmentRows)) {
      return NextResponse.json({ error: 'installmentPlanId and installmentRows are required' }, { status: 400 });
    }
    const config = await upsertFeeConfig({
      cycleId: params.id,
      installmentPlanId,
      installmentRows,
    });
    return NextResponse.json(config, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save fee config' }, { status: 500 });
  }
}
