import { NextRequest, NextResponse } from 'next/server';
import { getStoryById, updateStory } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 20_000;

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const story = await getStoryById(id);
    if (!story) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ story });
  } catch (err: unknown) {
    console.error('Error fetching story:', err);
    return NextResponse.json({ error: 'Gagal memuat story.' }, { status: 500 });
  }
}

// PATCH /api/stories/[id] — edit title/description.
// Field tak dikenal (termasuk injeksi status/"order") diabaikan; 404 → 409 approved → 400.
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const existing = await getStoryById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Story sudah disetujui — konten terkunci.' }, { status: 409 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const fields: { title?: string; description?: string } = {};

    if (typeof body.title === 'string') {
      const title = body.title.trim();
      if (!title) {
        return NextResponse.json({ error: 'Judul story wajib diisi.' }, { status: 400 });
      }
      if (title.length > MAX_TITLE) {
        return NextResponse.json({ error: `Judul story maksimal ${MAX_TITLE} karakter.` }, { status: 400 });
      }
      fields.title = title;
    }
    if (typeof body.description === 'string') {
      const description = body.description.trim();
      if (!description) {
        return NextResponse.json({ error: 'Deskripsi story wajib diisi.' }, { status: 400 });
      }
      if (description.length > MAX_DESCRIPTION) {
        return NextResponse.json(
          { error: `Deskripsi story maksimal ${MAX_DESCRIPTION} karakter.` },
          { status: 400 }
        );
      }
      fields.description = description;
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang valid untuk diperbarui.' }, { status: 400 });
    }

    const story = await updateStory(id, fields);
    return NextResponse.json({ story });
  } catch (err: unknown) {
    console.error('Error updating story:', err);
    return NextResponse.json({ error: 'Gagal memperbarui story.' }, { status: 500 });
  }
}
