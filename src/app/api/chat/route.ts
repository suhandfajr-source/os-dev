import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import {
  getConversationById,
  createConversation,
  getConversationWithMessages,
  addMessage,
  addAttachment,
  updateConversationTitle,
} from '@/lib/db';
import { getAIProvider } from '@/lib/ai/provider';
import { buildSystemPrompt } from '@/lib/ai/prompt-builder';
import { AIMessage } from '@/lib/ai/types';
import { Attachment, AssistantResponsePayload } from '@/types';
import { parseAndValidateAssistantResponse, deriveSearchableText } from '@/lib/ai/validator';
import { generateConceptIllustration } from '@/lib/ai/image-generator';
import fs from 'fs';

export const runtime = 'nodejs';

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
    const systemPrompt = buildSystemPrompt({ behaviorContext });

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
        systemPrompt,
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
