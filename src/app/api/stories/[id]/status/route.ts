import { NextRequest, NextResponse } from 'next/server';
import { getStoryById, updateStoryStatus } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const VALID_TARGET_STATUSES = ['doing', 'done'] as const;
type TargetStatus = (typeof VALID_TARGET_STATUSES)[number];

function isValidTargetStatus(val: unknown): val is TargetStatus {
  return typeof val === 'string' && (VALID_TARGET_STATUSES as readonly string[]).includes(val);
}

// PATCH /api/stories/[id]/status — transisi status pengerjaan (story board).
// Target hanya 'doing' | 'done'; hanya dari story non-draft (draft harus lewat approve dulu).
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const existing = await getStoryById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }

    const { status } = raw as Record<string, unknown>;
    if (!isValidTargetStatus(status)) {
      return NextResponse.json(
        { error: 'Status tidak valid. Target status harus "doing" atau "done".' },
        { status: 400 }
      );
    }

    if (existing.status === 'draft') {
      return NextResponse.json(
        { error: 'Story draft harus disetujui terlebih dahulu.' },
        { status: 409 }
      );
    }

    const story = await updateStoryStatus(id, status);
    return NextResponse.json({ story });
  } catch (err: unknown) {
    console.error('Error updating story status:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status story.' }, { status: 500 });
  }
}
