import { NextRequest, NextResponse } from 'next/server';
import { approveArtifact, getArtifactById } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/artifacts/[id]/approve — set status approved.
// Approve ulang = no-op aman 200, updated_at TIDAK diubah (berbohong soal konten).
// Brief tidak bisa di-approve (EC-4) — derivasi status planning hanya dari PRD.
export async function POST(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const existing = await getArtifactById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
    }
    if (existing.type === 'brief') {
      return NextResponse.json(
        { error: 'Brief tidak disetujui — hanya PRD yang disetujui.' },
        { status: 409 }
      );
    }
    const artifact = await approveArtifact(id);
    if (!artifact) {
      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ artifact });
  } catch (err: unknown) {
    console.error('Error approving artifact:', err);
    return NextResponse.json({ error: 'Gagal menyetujui artefak.' }, { status: 500 });
  }
}
