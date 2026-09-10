import { NextRequest, NextResponse } from 'next/server';
import { listConversations, searchConversations, createConversation } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');

    if (query && query.trim().length > 0) {
      const results = await searchConversations(query);
      return NextResponse.json({ results });
    }

    const conversations = await listConversations();
    return NextResponse.json({ conversations });
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    return NextResponse.json(
      { error: 'Gagal memuat percakapan.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body.id || crypto.randomUUID();
    const title = body.title || 'Percakapan Baru';

    const conversation = await createConversation(id, title);
    return NextResponse.json({ conversation });
  } catch (err: any) {
    console.error('Error creating conversation:', err);
    return NextResponse.json(
      { error: 'Gagal membuat percakapan baru.' },
      { status: 500 }
    );
  }
}
