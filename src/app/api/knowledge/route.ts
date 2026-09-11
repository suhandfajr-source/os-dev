import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getMessageById,
  updateMessagePayload,
  createKnowledgeEntry,
} from '@/lib/db';
import { AssistantResponsePayload } from '@/types';

export const runtime = 'nodejs';

/**
 * POST /api/knowledge
 * Aksi chips Dokumentasi Tools pada pesan assistant.
 * Body: { messageId, action: 'save' | 'skip', entry? }
 * - save : tulis entri dari response_payload pesan (server-authoritative) ke knowledge_entries
 * - skip : tandai skipped tanpa menulis KB
 * Idempotent: status selain 'pending' ditolak 409.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, action } = body || {};

    if (!messageId || !['save', 'skip'].includes(action)) {
      return NextResponse.json({ error: 'messageId dan action (save|skip) wajib diisi.' }, { status: 400 });
    }

    const message = await getMessageById(String(messageId));
    if (!message || !message.response_payload) {
      return NextResponse.json({ error: 'Pesan tidak ditemukan atau tanpa payload.' }, { status: 404 });
    }

    let payload: AssistantResponsePayload;
    try {
      payload = JSON.parse(message.response_payload);
    } catch {
      return NextResponse.json({ error: 'Payload pesan tidak valid.' }, { status: 400 });
    }

    const currentStatus = payload.knowledge_status ?? (payload.knowledge_entry ? 'pending' : null);
    if (currentStatus && currentStatus !== 'pending') {
      return NextResponse.json({ error: 'Entri ini sudah diproses sebelumnya.' }, { status: 409 });
    }
    if (!payload.knowledge_entry) {
      return NextResponse.json({ error: 'Pesan ini tidak memuat usulan entri knowledge base.' }, { status: 400 });
    }

    if (action === 'save') {
      const entryId = crypto.randomUUID();
      const saved = await createKnowledgeEntry(entryId, payload.knowledge_entry);
      payload.knowledge_status = 'saved';
      payload.knowledge_id = saved.id;
    } else {
      payload.knowledge_status = 'skipped';
    }

    await updateMessagePayload(message.id, JSON.stringify(payload));

    return NextResponse.json({
      ok: true,
      action,
      knowledge_status: payload.knowledge_status,
      knowledge_id: payload.knowledge_id ?? null,
    });
  } catch (err: any) {
    console.error('Error in knowledge API:', err);
    return NextResponse.json(
      { error: err?.message || 'Terjadi kesalahan saat memproses aksi knowledge base.' },
      { status: 500 }
    );
  }
}
