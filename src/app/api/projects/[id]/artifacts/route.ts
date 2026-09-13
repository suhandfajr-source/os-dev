import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, getArtifactsByProject } from '@/lib/db';
import { ArtifactStage, ArtifactType, ALL_ARTIFACT_STAGES, ALL_ARTIFACT_TYPES } from '@/types';

export const runtime = 'nodejs';

// GET /api/projects/[id]/artifacts?stage=&type=
// Filter tak dikenal diabaikan (kembalikan semua) — divalidasi terhadap union
// (EC-1/AD-1: sebelumnya cast langsung membuat filter bogus menjadi WHERE kosong).
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await ctx.params;

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const stageParam = searchParams.get('stage') as ArtifactStage | null;
    const typeParam = searchParams.get('type') as ArtifactType | null;

    const artifacts = await getArtifactsByProject(projectId, {
      stage: stageParam && ALL_ARTIFACT_STAGES.includes(stageParam) ? stageParam : undefined,
      type: typeParam && ALL_ARTIFACT_TYPES.includes(typeParam) ? typeParam : undefined,
    });
    return NextResponse.json({ artifacts });
  } catch (err: unknown) {
    console.error('Error fetching artifacts:', err);
    return NextResponse.json({ error: 'Gagal memuat artefak.' }, { status: 500 });
  }
}
