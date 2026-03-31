import { NextRequest, NextResponse } from 'next/server';
import { getCommentsByCycleId, addComment } from '@/lib/data/cycleComments';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const comments = await getCommentsByCycleId(params.id);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { author, text } = body;
    if (!author || !text) {
      return NextResponse.json({ error: 'author and text are required' }, { status: 400 });
    }
    const comment = await addComment({
      cycleId: params.id,
      author,
      text,
    });
    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}
