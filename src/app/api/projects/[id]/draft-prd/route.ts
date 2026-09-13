import { NextRequest, NextResponse } from 'next/server';
import { getProjectById, upsertBriefArtifact, upsertPrdArtifact, getArtifactRowByProjectStageType } from '@/lib/db';
import { getAIProvider } from '@/lib/ai/provider';
import { PRD_SYSTEM_PROMPT, buildPrdMessages, parsePrdResponse, composePrdContent } from '@/lib/ai/prd-prompt';
import crypto from 'crypto';

export const runtime = 'nodejs';

const MAX_BRIEF_LENGTH = 8_000;

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
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
    const body = raw as Record<string, unknown>;
    const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
    const skipAi = body.skipAi === true;

    if (!brief) {
      return NextResponse.json({ error: 'Brief wajib diisi.' }, { status: 400 });
    }
    if (brief.length > MAX_BRIEF_LENGTH) {
      return NextResponse.json(
        { error: `Brief maksimal ${MAX_BRIEF_LENGTH} karakter.` },
        { status: 400 }
      );
    }

    // 1. Persist brief DULU — kegagalan AI tidak menghilangkan tulisan user.
    //    Jalur skipAi (R10/AD-3): simpan brief saja — legal bahkan saat PRD
    //    sudah approved, agar editan brief user tidak hilang.
    const briefArtifact = await upsertBriefArtifact(projectId, brief, crypto.randomUUID());

    if (skipAi) {
      return NextResponse.json({ briefArtifact });
    }

    // 2. Regenerate setelah approve ditutup: cegah status zombie "approved tapi konten draft"
    const existingPrd = await getArtifactRowByProjectStageType(projectId, 'planning', 'prd');
    if (existingPrd && existingPrd.status === 'approved') {
      return NextResponse.json(
        { error: 'PRD sudah disetujui. Tidak bisa membuat draf baru untuk PRD yang sudah approved.', briefArtifact },
        { status: 409 }
      );
    }

    // 3. Panggil AI (tier berat AI_MODEL via getAIProvider; JSON via responseMimeType)
    const provider = getAIProvider();
    const rawAi = await provider.generateResponse({
      systemPrompt: PRD_SYSTEM_PROMPT,
      messages: buildPrdMessages(brief),
    });

    // 4. Harden parse — gagal parse/field hilang = 502, tidak ada PRD tersimpan
    let parsed;
    try {
      parsed = parsePrdResponse(rawAi);
    } catch (err: unknown) {
      console.error('PRD AI response invalid:', err);
      return NextResponse.json(
        {
          error: err instanceof Error ? err.message : 'Draf AI tidak valid. Silakan coba lagi.',
          briefArtifact,
        },
        { status: 502 }
      );
    }

    // 5. Simpan PRD draft — upsert atomik: null berarti approved di antara cek & simpan (TOCTOU, R1)
    const prdArtifact = await upsertPrdArtifact(projectId, composePrdContent(parsed), crypto.randomUUID());
    if (!prdArtifact) {
      return NextResponse.json(
        { error: 'PRD sudah disetujui. Tidak bisa membuat draf baru.', briefArtifact },
        { status: 409 }
      );
    }

    return NextResponse.json({ briefArtifact, prdArtifact });
  } catch (err: unknown) {
    console.error('Error drafting PRD:', err);
    // R8/AD-5: kata kunci spesifik — regex generik "API" menyesatkan
    const message =
      err instanceof Error && /API key|AI_MODEL|quota|resource_exhausted|429/i.test(err.message)
        ? 'Gagal menghubungi AI — periksa konfigurasi AI_API_KEY / AI_MODEL di environment.'
        : 'Gagal membuat draf PRD dari AI. Silakan coba lagi.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
