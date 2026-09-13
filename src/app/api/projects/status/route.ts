import { NextResponse } from 'next/server';
import { getAllStageStatuses } from '@/lib/db';

export const runtime = 'nodejs';

// GET /api/projects/status — peta status tahapan untuk semua proyek (CAP-4).
// Static segment 'status' di-Next.js diprioritaskan di atas [id], aman dari route conflict.
export async function GET() {
  try {
    const statuses = await getAllStageStatuses();
    return NextResponse.json({ statuses });
  } catch (err: unknown) {
    console.error('Error fetching stage statuses:', err);
    return NextResponse.json({ error: 'Gagal memuat status tahapan.' }, { status: 500 });
  }
}
