import { NextResponse } from 'next/server';
import { resetStore } from '@/lib/data/fileStore';

export async function POST() {
  resetStore();
  return NextResponse.json({ ok: true });
}
