import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getConversationById,
  createConversation,
  getConversationWithMessages,
  addMessage,
  addAttachment,
  updateConversationTitle,
  searchKnowledge,
  getKnowledgeEntries,
  findKnowledgeEntriesByName,
} from '@/lib/db';
import { parseKbCommand, KbCommand } from '@/lib/kb/commands';
import { getAIProvider } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/prompt-builder';
import { AIMessage } from '@/lib/ai/types';
import { Attachment, AssistantResponsePayload } from '@/types';
import { parseAndValidateAssistantResponse, deriveSearchableText } from '@/lib/ai/validator';
import { generateConceptIllustration } from '@/lib/ai/image-generator';
import fs from 'fs';

export const runtime = 'nodejs';

const KB_PERSONA = { name: 'Gib-run' };

function kbPayload(markdown: string, extra?: Partial<AssistantResponsePayload>): string {
  const payload: AssistantResponsePayload = {
    persona: KB_PERSONA,
    blocks: [{ type: 'markdown', content: markdown }],
    ...extra,
  };
  return JSON.stringify(payload);
}

/**
 * Handler perintah kelola KB (CAP-4) — tanpa panggilan AI.
 * Return: Response | null (null = bukan perintah, lanjut ke AI).
 */
async function handleKbCommand(
  command: KbCommand,
  conversationId: string,
  isFirstMessage: boolean,
  rawContent: string
): Promise<NextResponse | null> {
  let markdown = '';
  let extra: Partial<AssistantResponsePayload> | undefined;

  if (command.action === 'list') {
    const entries = await getKnowledgeEntries();
    if (entries.length === 0) {
      markdown =
        '📦 Dokumentasi Tools kamu masih kosong nih.\n\nGini caranya: tanya aja ke sini tentang tools/library/konsep apa pun, nanti aku tawarkan buat disimpan — tinggal tekan **Simpan 📦**. Gratis, gak nambah kuota kok!';
    } else {
      markdown =
        '📦 *Dokumentasi Tools kamu:*\n\n' +
        entries.map((e) => `- *${e.name}* (${e.type}) — ${e.function_summary}`).join('\n') +
        '\n\nMau lihat detail? Bilang aja _"lihat entri [nama]"_ ya!';
    }
  } else if (command.action === 'show') {
    const matches = await findKnowledgeEntriesByName(command.name);
    if (matches.length === 0) {
      markdown = `Hmm, aku gak nemu entri *"${command.name}"* di dokumentasi kamu. Coba cek lagi ejaannya, atau lihat semua dengan bilang _"tools apa aja yang gua simpan"_.`;
    } else {
      const e = matches[0];
      markdown =
        `📦 *${e.name}* (${e.type})\n\n` +
        `*Fungsi:* ${e.function_summary}\n\n` +
        `*Kapan dipakai:* ${e.when_to_use}\n\n` +
        `*Cara mulai:* ${e.how_to_start}`;
    }
  } else {
    // delete — selalu minta konfirmasi ulang lewat chips (CAP-4)
    const matches = await findKnowledgeEntriesByName(command.name);
    if (matches.length === 0) {
      markdown = `Aku gak nemu entri *"${command.name}"* yang mau kamu hapus. Coba cek lagi nama-nya ya, atau bilang _"tools apa aja yang gua simpan"_ buat lihat daftar-nya.`;
    } else {
      const target = matches[0];
      extra = {
        kb_confirm: { action: 'delete', entry_id: target.id, name: target.name, status: 'pending' },
      };
      markdown = `Yakin mau hapus *"${target.name}"* dari dokumentasi kamu?\n\nEntri ini bakal ilang permanen loh — tekan konfirmasi di bawah kalau memang serius. 🗑️`;
    }
  }

  const assistantMessageId = crypto.randomUUID();
  const assistantMessage = await addMessage(
    assistantMessageId,
    conversationId,
    'assistant',
    markdown,
    `Persona: ${KB_PERSONA.name}`,
    kbPayload(markdown, extra)
  );

  if (isFirstMessage) {
    await updateConversationTitle(conversationId, rawContent.slice(0, 30) || 'Percakapan Baru');
  }

  return NextResponse.json({
    conversationId,
    message: assistantMessage,
    personaName: KB_PERSONA.name,
    autoTitle: undefined,
  });
}

interface IncomingAttachment {
  filename: string;
  mimeType: string;
  storagePath: string;
  url?: string;
  base64?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { conversationId, content, attachments = [], kbEdit = null } = body;

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Pesan atau lampiran tidak boleh kosong.' },
        { status: 400 }
      );
    }

    // 1. Ensure conversation exists
    let isNewConversation = false;
    if (!conversationId) {
      conversationId = crypto.randomUUID();
      await createConversation(conversationId, 'Percakapan Baru');
      isNewConversation = true;
    } else {
      const existing = await getConversationById(conversationId);
      if (!existing) {
        await createConversation(conversationId, 'Percakapan Baru');
        isNewConversation = true;
      }
    }

    // Check existing message count before adding new one
    const prevConversation = await getConversationWithMessages(conversationId);
    const isFirstMessage = !prevConversation || prevConversation.messages.length === 0;

    // 2. Save User Message
    const userMessageId = crypto.randomUUID();
    await addMessage(userMessageId, conversationId, 'user', content || '');

    // 3. Save Attachments
    const savedAttachments: (Attachment & { base64?: string })[] = [];
    for (const att of attachments as IncomingAttachment[]) {
      const attId = crypto.randomUUID();
      const saved = await addAttachment(
        attId,
        userMessageId,
        att.filename,
        att.mimeType,
        att.storagePath
      );
      savedAttachments.push({ ...saved, base64: att.base64 });
    }

    // 4. Fetch full updated message history for AI context
    const updatedConv = await getConversationWithMessages(conversationId);
    const messages = updatedConv?.messages || [];

    const provider = getAIProvider();

    // 4b. Perintah kelola KB (list/show/delete) — ditangani lokal, tanpa kuota AI (CAP-4)
    const kbCommand = content ? parseKbCommand(content) : null;
    if (kbCommand) {
      const kbResponse = await handleKbCommand(kbCommand, conversationId, isFirstMessage, content);
      if (kbResponse) return kbResponse;
    }

    // 5. Build Single-Pass System Prompt (incorporating Assistant Brief + KB revision context)
    let behaviorContext: string | null = null;
    if (kbEdit?.entry && typeof kbEdit.entry === 'object') {
      behaviorContext = [
        '# PERINTAH REVISI KNOWLEDGE BASE:',
        'User sedang merevisi entri knowledge base berikut (JSON):',
        JSON.stringify(kbEdit.entry),
        'Terapkan revisi yang diminta user pada entri ini. Jawab dengan gaya persona biasa (singkat, tanpa salam pembuka penuh), dan WAJIB sertakan field "knowledge_entry" versi terbaru pada JSON.',
      ].join('\n');
    }
    // 5b. Recall hemat: FTS lokal atas KB sebelum panggilan AI (CAP-3)
    let knowledgeContext: string | null = null;
    if (content && content.trim().length > 0) {
      try {
        const kbHits = await searchKnowledge(content, 3);
        if (kbHits.length > 0) {
          knowledgeContext = kbHits
            .map(
              (k, i) =>
                `${i + 1}. [${k.type}] ${k.name} — ${k.function_summary} (kapan dipakai: ${k.when_to_use})`
            )
            .join('\n');
        }
      } catch (kbErr) {
        console.warn('Knowledge recall failed (non-fatal):', kbErr);
      }
    }
    const finalSystemPrompt = buildSystemPrompt({
      behaviorContext,
      knowledgeContext,
    });

    // 6. Format messages for AI provider
    const aiMessages: AIMessage[] = messages.map((m) => {
      const isCurrentMessage = m.id === userMessageId;
      const images = (m.attachments || []).map((att) => {
        let base64Data = '';
        if (isCurrentMessage) {
          const matching = savedAttachments.find((a) => a.id === att.id);
          if (matching?.base64) {
            base64Data = matching.base64;
          }
        }
        if (!base64Data && fs.existsSync(att.storage_path)) {
          try {
            const buffer = fs.readFileSync(att.storage_path);
            base64Data = buffer.toString('base64');
          } catch (e) {
            console.error('Failed to read attachment file for AI context:', e);
          }
        }

        return {
          inlineData: base64Data
            ? {
                data: base64Data,
                mimeType: att.mime_type,
              }
            : undefined,
          filename: att.filename,
        };
      });

      return {
        role: m.role as 'user' | 'assistant',
        content: m.content,
        images: images.length > 0 ? images : undefined,
      };
    });

    // 7. Single-Pass Call: 1 Request generates Persona, Response Blocks, and AutoTitle
    let rawResponseText = '';
    try {
      rawResponseText = await provider.generateResponse({
        systemPrompt: finalSystemPrompt,
        messages: aiMessages,
      });
    } catch (aiErr: any) {
      console.error('AI provider error:', aiErr);
      const isRateLimit = aiErr?.status === 429 || /quota|resource_exhausted|rate limit/i.test(aiErr?.message || '');
      const userFriendlyMessage = isRateLimit
        ? 'Batas frekuensi permintaan gratis tercapai sesaat. Mohon tunggu sekitar 20-30 detik lalu kirim ulang.'
        : 'Maaf, terjadi kendala saat memproses jawaban dengan AI. Pastikan API key Anda sudah benar di .env.local.';
      return NextResponse.json({ error: userFriendlyMessage }, { status: isRateLimit ? 429 : 500 });
    }

    // 8. Validate Structured Response & Generate Concept Illustration Instantly
    const validatedPayload: AssistantResponsePayload | null = parseAndValidateAssistantResponse(rawResponseText);

    let finalPlainContent = '';
    let finalPayloadJson = '';
    let personaName = 'Assistant';
    let autoTitle: string | undefined = undefined;

    if (validatedPayload && validatedPayload.blocks && validatedPayload.blocks.length > 0) {
      if (validatedPayload.persona?.name) {
        personaName = validatedPayload.persona.name;
      }
      if (validatedPayload.autoTitle) {
        autoTitle = validatedPayload.autoTitle;
      }

      // Generate Concept Illustration for illustration block instantly
      for (const block of validatedPayload.blocks) {
        if (block.type === 'illustration' && block.prompt) {
          try {
            const result = await generateConceptIllustration(block.prompt, block.caption);
            if (result) {
              block.imageUrl = result.imageUrl;
              block.svgContent = result.svgContent;
            }
          } catch (imgErr) {
            console.warn('Illustration rendering error:', imgErr);
          }
        }
      }

      finalPlainContent = deriveSearchableText(validatedPayload.blocks);
      finalPayloadJson = JSON.stringify(validatedPayload);

      if (validatedPayload.knowledge_entry) {
        finalPayloadJson = JSON.stringify({ ...validatedPayload, knowledge_status: 'pending' });
      }
    } else {
      finalPlainContent = rawResponseText;
      const fallbackPayload: AssistantResponsePayload = {
        persona: { name: 'Assistant' },
        blocks: [{ type: 'markdown', content: rawResponseText }],
      };
      finalPayloadJson = JSON.stringify(fallbackPayload);
    }

    // 9. Save Assistant Message with plain text and response_payload
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage = await addMessage(
      assistantMessageId,
      conversationId,
      'assistant',
      finalPlainContent,
      personaName ? `Persona: ${personaName}` : null,
      finalPayloadJson
    );

    // 10. Update title if first message
    if (isFirstMessage) {
      const titleToSave = autoTitle || (content ? content.slice(0, 30) : 'Percakapan Baru');
      if (titleToSave) {
        await updateConversationTitle(conversationId, titleToSave);
      }
    }

    return NextResponse.json({
      conversationId,
      message: assistantMessage,
      personaName,
      autoTitle,
    });
  } catch (err: any) {
    console.error('CRITICAL Error in chat API handler:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Terjadi kesalahan sistem saat memproses percakapan.',
        details: err?.stack || String(err),
      },
      { status: 500 }
    );
  }
}
