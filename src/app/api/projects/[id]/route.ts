import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, updateProject, deleteProject } from '@/lib/db';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err: unknown) {
    console.error('Error fetching project:', err);
    return NextResponse.json({ error: 'Gagal memuat proyek.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const fields: { name?: string; description?: string } = {};

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: 'Nama proyek wajib diisi.' }, { status: 400 });
      }
      if (name.length > 200) {
        return NextResponse.json({ error: 'Nama proyek maksimal 200 karakter.' }, { status: 400 });
      }
      fields.name = name;
    }
    if (typeof body.description === 'string') {
      const description = body.description.trim();
      if (description.length > 2000) {
        return NextResponse.json({ error: 'Deskripsi maksimal 2000 karakter.' }, { status: 400 });
      }
      fields.description = description;
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Tidak ada field yang valid untuk diperbarui.' }, { status: 400 });
    }

    const project = await updateProject(id, fields);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (err: unknown) {
    console.error('Error updating project:', err);
    return NextResponse.json({ error: 'Gagal memperbarui proyek.' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const deleted = await deleteProject(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error('Error deleting project:', err);
    return NextResponse.json({ error: 'Gagal menghapus proyek.' }, { status: 500 });
  }
}
