import { NextRequest, NextResponse } from 'next/server';
import {
  getProjectById,
  getArtifactRowByProjectStageType,
  upsertSpecArtifact,
  listStories,
  replaceStories,
} from '@/lib/db';
import { getAIProvider } from '@/lib/ai/provider';
import { SPEC_SYSTEM_PROMPT, buildSpecMessages, parseSpecResponse } from '@/lib/ai/spec-prompt';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await ctx.params;

    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
    }

    // Guard berlapis dulu (body draft-spec tidak membawa input — POST tanpa body sah)

    // Prasyarat 1: PRD harus approved
    const prd = await getArtifactRowByProjectStageType(projectId, 'planning', 'prd');
    if (!prd || prd.status !== 'approved') {
      return NextResponse.json(
        { error: 'PRD harus disetujui dulu sebelum dipecah menjadi spec + stories.' },
        { status: 409 }
      );
    }

    // Prasyarat 2: spec belum approved
    const existingSpec = await getArtifactRowByProjectStageType(projectId, 'planning', 'spec');
    if (existingSpec && existingSpec.status === 'approved') {
      return NextResponse.json(
        { error: 'Spec sudah disetujui — regenerasi terkunci.' },
        { status: 409 }
      );
    }

    // Prasyarat 3: tidak ada story approved (regenerate tidak boleh menghapus keputusan user)
    const stories = await listStories(projectId);
    if (stories.some((s) => s.status === 'approved')) {
      return NextResponse.json(
        { error: 'Ada story yang sudah disetujui — regenerasi terkunci agar keputusan user tidak hilang.' },
        { status: 409 }
      );
    }

    // Panggil AI (tier berat AI_MODEL; JSON via responseMimeType)
    const provider = getAIProvider();
    const rawAi = await provider.generateResponse({
      systemPrompt: SPEC_SYSTEM_PROMPT,
      messages: buildSpecMessages(prd.content),
    });

    // Harden parse — gagal = 502, tidak ada spec/stories tersimpan
    let parsed;
    try {
      parsed = parseSpecResponse(rawAi);
    } catch (err: unknown) {
      console.error('Spec AI response invalid:', err);
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'Hasil pecahan AI tidak valid. Silakan coba lagi.',
        },
        { status: 502 }
      );
    }

    // Upsert spec (atomik — null berarti approved di antara cek & simpan, TOCTOU)
    const specArtifact = await upsertSpecArtifact(projectId, parsed.spec_markdown, crypto.randomUUID());
    if (!specArtifact) {
      return NextResponse.json({ error: 'Spec sudah disetujui — regenerasi terkunci.' }, { status: 409 });
    }

    // Ganti seluruh stories (batch atomik, order 0..N-1)
    const newStories = await replaceStories(projectId, parsed.stories, crypto.randomUUID());

    return NextResponse.json({ specArtifact, stories: newStories });
  } catch (err: unknown) {
    console.error('Error drafting spec:', err);
    const message =
      err instanceof Error && /API key|AI_MODEL|quota|resource_exhausted|429/i.test(err.message)
        ? 'Gagal menghubungi AI — periksa konfigurasi AI_API_KEY / AI_MODEL di environment.'
        : 'Gagal memecah PRD menjadi spec + stories. Silakan coba lagi.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
