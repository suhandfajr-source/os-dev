import { NextRequest, NextResponse } from 'next/server';
import { approveStory } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/stories/[id]/approve — set status approved.
// Approve ulang = no-op aman 200, updated_at TIDAK diubah.
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const story = await approveStory(id);
    if (!story) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ story });
  } catch (err: unknown) {
    console.error('Error approving story:', err);
    return NextResponse.json({ error: 'Gagal menyetujui story.' }, { status: 500 });
  }
}
