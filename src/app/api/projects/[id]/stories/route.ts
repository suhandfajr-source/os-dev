import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, listStories } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/projects/[id]/stories — urut "order" ASC (deterministik)
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await ctx.params;

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    const stories = await listStories(projectId);
    return NextResponse.json({ stories });
  } catch (err: unknown) {
    console.error('Error fetching stories:', err);
    return NextResponse.json({ error: 'Gagal memuat stories.' }, { status: 500 });
  }
}
