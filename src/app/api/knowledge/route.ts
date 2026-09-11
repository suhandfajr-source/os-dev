import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getMessageById,
  updateMessagePayload,
  createKnowledgeEntry,
  updateKnowledgeEntry,
  findKnowledgeEntriesByName,
  deleteKnowledgeEntry,
} from '@/lib/db';
import { AssistantResponsePayload } from '@/types';

export const runtime = 'nodejs';

const normalizeName = (s: string) => (s || '').trim().toLowerCase();

/**
 * POST /api/knowledge
 * Aksi chips Dokumentasi Tools pada pesan assistant.
 * Body: { messageId, action: 'save' | 'skip' | 'confirm_delete' | 'cancel_delete' }
 * - save : tulis entri dari response_payload pesan (server-authoritative); nama sudah ada → update (CAP-5)
 * - skip : tandai skipped tanpa menulis KB
 * - confirm_delete / cancel_delete : konfirmasi ulang penghapusan entri (CAP-4)
 * Idempotent: status selain 'pending' ditolak 409.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messageId, action } = body || {};

    if (!messageId || !['save', 'skip', 'confirm_delete', 'cancel_delete'].includes(action)) {
      return NextResponse.json(
        { error: 'messageId dan action (save|skip|confirm_delete|cancel_delete) wajib diisi.' },
        { status: 400 }
      );
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

    if (action === 'confirm_delete' || action === 'cancel_delete') {
      const confirm = payload.kb_confirm;
      if (!confirm || confirm.action !== 'delete' || !confirm.entry_id) {
        return NextResponse.json({ error: 'Pesan ini tidak memuat konfirmasi penghapusan.' }, { status: 400 });
      }
      if (confirm.status && confirm.status !== 'pending') {
        return NextResponse.json({ error: 'Konfirmasi ini sudah diproses sebelumnya.' }, { status: 409 });
      }
      if (action === 'confirm_delete') {
        await deleteKnowledgeEntry(confirm.entry_id);
        confirm.status = 'confirmed';
      } else {
        confirm.status = 'cancelled';
      }
      await updateMessagePayload(message.id, JSON.stringify(payload));
      return NextResponse.json({ ok: true, action, kb_confirm: confirm.status });
    }

    if (currentStatus && currentStatus !== 'pending') {
      return NextResponse.json({ error: 'Entri ini sudah diproses sebelumnya.' }, { status: 409 });
    }
    if (!payload.knowledge_entry) {
      return NextResponse.json({ error: 'Pesan ini tidak memuat usulan entri knowledge base.' }, { status: 400 });
    }

    if (action === 'save') {
      // CAP-5: nama yang sudah ada → update entri lama, bukan duplikat
      const existing = await findKnowledgeEntriesByName(payload.knowledge_entry.name);
      const dup = existing.find(
        (e) => normalizeName(e.name) === normalizeName(payload.knowledge_entry!.name)
      );

      let savedId: string;
      if (dup) {
        const updated = await updateKnowledgeEntry(dup.id, payload.knowledge_entry);
        savedId = updated.id;
        payload.knowledge_status = 'saved';
        payload.knowledge_id = savedId;
        payload.knowledge_updated = true;
      } else {
        const entryId = crypto.randomUUID();
        const saved = await createKnowledgeEntry(entryId, payload.knowledge_entry);
        savedId = saved.id;
        payload.knowledge_status = 'saved';
        payload.knowledge_id = savedId;
      }
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
