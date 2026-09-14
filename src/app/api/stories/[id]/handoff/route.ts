import { NextRequest, NextResponse } from 'next/server';
import { getStoryById, getProjectById, getArtifactRowByProjectStageType } from '@/lib/db';
import { generateHandoffPackage } from '@/lib/handoff/generator';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/stories/[id]/handoff — hasilkan paket handoff markdown untuk coding agent
export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const story = await getStoryById(id);
    if (!story) {
      return NextResponse.json({ error: 'Story tidak ditemukan.' }, { status: 404 });
    }

    if (story.status === 'draft') {
      return NextResponse.json(
        { error: 'Story draft harus disetujui terlebih dahulu sebelum membuat paket handoff.' },
        { status: 409 }
      );
    }

    const project = await getProjectById(story.project_id);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    const specArtifact = await getArtifactRowByProjectStageType(story.project_id, 'planning', 'spec');
    const handoff = generateHandoffPackage(project, story, specArtifact?.content);

    return NextResponse.json({ handoff, story });
  } catch (err: unknown) {
    console.error('Error generating handoff package:', err);
    return NextResponse.json({ error: 'Gagal membuat paket handoff.' }, { status: 500 });
  }
}
