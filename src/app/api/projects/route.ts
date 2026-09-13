import { NextRequest, NextResponse } from 'next/server';
import { listProjects, createProject } from '@/lib/db';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const projects = await listProjects();
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error('Error fetching projects:', err);
    return NextResponse.json({ error: 'Gagal memuat daftar proyek.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
    }
    const body = raw as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'Nama proyek wajib diisi.' }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: 'Nama proyek maksimal 200 karakter.' }, { status: 400 });
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: 'Deskripsi maksimal 2000 karakter.' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const project = await createProject(id, name, description);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err: unknown) {
    console.error('Error creating project:', err);
    return NextResponse.json({ error: 'Gagal membuat proyek baru.' }, { status: 500 });
  }
}
