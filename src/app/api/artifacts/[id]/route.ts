import { NextRequest, NextResponse } from 'next/server';
import { getArtifactById, updateArtifactContent } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const artifact = await getArtifactById(id);
    if (!artifact) {
      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ artifact });
  } catch (err: unknown) {
    console.error('Error fetching artifact:', err);
    return NextResponse.json({ error: 'Gagal memuat artefak.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    // Urutan cek sesuai I/O Matrix: 404 → 409 (approved terkunci, EC-3) → 400
    const existing = await getArtifactById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
    }
    if (existing.status === 'approved') {
      return NextResponse.json(
        { error: 'Artefak sudah disetujui — konten terkunci.' },
        { status: 409 }
      );
    }
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }
    const content =
      typeof (raw as Record<string, unknown>).content === 'string'
        ? ((raw as { content: string }).content).trim()
        : '';

    if (!content) {
      return NextResponse.json({ error: 'Konten artefak wajib diisi.' }, { status: 400 });
    }

    const artifact = await updateArtifactContent(id, content);
    return NextResponse.json({ artifact });
  } catch (err: unknown) {
    console.error('Error updating artifact:', err);
    return NextResponse.json({ error: 'Gagal memperbarui artefak.' }, { status: 500 });
  }
}
