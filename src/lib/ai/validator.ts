import { z } from 'zod';
import { AssistantResponsePayload, ResponseBlock } from '@/types';

export const MarkdownBlockSchema = z.object({
  type: z.literal('markdown'),
  content: z.string(),
});

export const IllustrationBlockSchema = z.object({
  type: z.literal('illustration'),
  prompt: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  imageUrl: z.string().optional(),
  svgContent: z.string().optional(),
  failed: z.boolean().optional(),
});

export const MermaidBlockSchema = z.object({
  type: z.literal('mermaid'),
  code: z.string(),
  caption: z.string().optional(),
});

export const FunFactBlockSchema = z.object({
  type: z.literal('fun_fact'),
  content: z.string(),
});

export const TryItBlockSchema = z.object({
  type: z.literal('try_it'),
  title: z.string().optional(),
  steps: z.array(z.string()),
});

export const ResponseBlockSchema = z.discriminatedUnion('type', [
  MarkdownBlockSchema,
  IllustrationBlockSchema,
  MermaidBlockSchema,
  FunFactBlockSchema,
  TryItBlockSchema,
]);

export const KnowledgeEntryContentSchema = z.object({
  type: z.string().min(1),
  name: z.string().min(1),
  function_summary: z.string().min(1),
  when_to_use: z.string().min(1),
  how_to_start: z.string().min(1),
});

export const AssistantResponseSchema = z.object({
  persona: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      title: z.string().optional(),
    })
    .optional(),
  autoTitle: z.string().optional(),
  blocks: z.array(ResponseBlockSchema).min(1),
  knowledge_entry: KnowledgeEntryContentSchema.optional(),
});

function detectPersonaFromBlocks(blocks: any[]): { id?: string; name: string; title?: string } {
  const firstMd = blocks.find((b) => b.type === 'markdown')?.content || '';
  if (/joke-wi|jokowi/i.test(firstMd)) return { id: 'joke-wi', name: 'Joke-Wi', title: 'Infrastruktur & Database' };
  if (/pra-bow-wo|prabowo|pra-bow/i.test(firstMd)) return { id: 'pra-bow-wo', name: 'Pra-Bow Wo', title: 'Terminal CLI & Git' };
  if (/luh-hut|luhut/i.test(firstMd)) return { id: 'luh-hut', name: 'Luh-Hut', title: 'Cloud & System Architecture' };
  if (/mega-chan|megawati/i.test(firstMd)) return { id: 'mega-chan', name: 'Mega-Chan', title: 'Logika Dasar & Algoritma' };
  if (/mah-fud|mahfud/i.test(firstMd)) return { id: 'mah-fud', name: 'Mah-Fud', title: 'Security & Clean Code' };
  if (/an-ies|anies/i.test(firstMd)) return { id: 'an-ies', name: 'An-Ies', title: 'Design Patterns & Arsitektur' };
  return { id: 'gib-run', name: 'Gib-run', title: 'Modern Web & API Sat-Set' };
}

/**
 * Validates raw LLM response text against the structured schema.
 * Safely handles markdown wrappers and malformed JSON.
 * Returns null if the structure is invalid.
 */
export function parseAndValidateAssistantResponse(rawText: string): AssistantResponsePayload | null {
  if (!rawText || !rawText.trim()) return null;

  try {
    let clean = rawText.trim();

    // Remove markdown code fences if LLM wrapped output in ```json ... ```
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    const parsed = JSON.parse(clean);
    const validation = AssistantResponseSchema.safeParse(parsed);

    let payload: AssistantResponsePayload | null = null;
    if (validation.success) {
      payload = validation.data as AssistantResponsePayload;
    } else if (Array.isArray(parsed.blocks) && parsed.blocks.length > 0) {
      const entryCheck = KnowledgeEntryContentSchema.safeParse(parsed.knowledge_entry);
      payload = {
        persona: parsed.persona,
        autoTitle: typeof parsed.autoTitle === 'string' ? parsed.autoTitle : undefined,
        blocks: parsed.blocks,
        knowledge_entry: entryCheck.success ? entryCheck.data : undefined,
      };
    }

    if (payload && (!payload.persona || !payload.persona.name || payload.persona.name.toLowerCase() === 'assistant')) {
      payload.persona = detectPersonaFromBlocks(payload.blocks);
    }

    return payload;
  } catch (err) {
    console.warn('Could not parse JSON from LLM output for structured response:', err);
    return null;
  }
}

/**
 * Derives clean plain text for search and backward compatibility from response blocks.
 */
export function deriveSearchableText(blocks: ResponseBlock[]): string {
  const parts: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'markdown':
        if (block.content) parts.push(block.content);
        break;
      case 'illustration':
        if (block.caption) parts.push(`[Ilustrasi: ${block.caption}]`);
        else if (block.alt) parts.push(`[Ilustrasi: ${block.alt}]`);
        break;
      case 'mermaid':
        if (block.caption) parts.push(`[Diagram: ${block.caption}]`);
        if (block.code) parts.push(block.code);
        break;
      case 'fun_fact':
        if (block.content) parts.push(`Fun Fact: ${block.content}`);
        break;
      case 'try_it':
        if (block.title) parts.push(`Coba Sendiri: ${block.title}`);
        if (block.steps && block.steps.length > 0) {
          parts.push(block.steps.map((s, idx) => `${idx + 1}. ${s}`).join('\n'));
        }
        break;
    }
  }

  return parts.join('\n\n');
}
