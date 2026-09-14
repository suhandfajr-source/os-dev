import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, getChangelogEntries, addChangelogEntry } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const MAX_NOTE_LENGTH = 2000;

// GET /api/projects/[id]/changelog — daftar catatan changelog (terbaru dulu)
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id: projectId } = await ctx.params;

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    const entries = await getChangelogEntries(projectId);
    return NextResponse.json({ entries });
  } catch (err: unknown) {
    console.error('Error fetching changelog entries:', err);
    return NextResponse.json({ error: 'Gagal memuat catatan changelog.' }, { status: 500 });
  }
}

// POST /api/projects/[id]/changelog — tambah catatan append-only
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id: projectId } = await ctx.params;

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }

    const { note: rawNote } = raw as Record<string, unknown>;
    if (typeof rawNote !== 'string') {
      return NextResponse.json({ error: 'Catatan changelog wajib diisi.' }, { status: 400 });
    }

    const note = rawNote.trim();
    if (!note) {
      return NextResponse.json({ error: 'Catatan changelog wajib diisi.' }, { status: 400 });
    }

    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Catatan changelog maksimal ${MAX_NOTE_LENGTH.toLocaleString('id-ID')} karakter.` },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const entry = await addChangelogEntry(projectId, note, id);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error adding changelog entry:', err);
    return NextResponse.json({ error: 'Gagal menambahkan catatan changelog.' }, { status: 500 });
  }
}
