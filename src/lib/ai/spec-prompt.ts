import { AIMessage } from './types';

/**
 * System prompt pecah PRD → spec + stories (Story 4 — single point of failure loop inti).
 *
 * Kualitas wajib (hasil elicitation):
 * - Spec memuat kriteria selesai per story (dikonsumsi paket handoff story 6).
 * - Stories HANYA dari PRD — tidak mengarang fitur baru.
 * - Batas wajar jumlah story (mitigasi truncation JSON di PRD panjang).
 */

export const SPEC_SYSTEM_PROMPT = `Kamu adalah senior product owner yang memecah PRD menjadi spec teknis + daftar stories untuk vibecoder non-IT.
Tugas: dari PRD yang sudah disetujui user, susun spec implementasi dan pecah menjadi stories yang siap dieksekusi satu per satu oleh coding agent.

ATURAN WAJIB (jangan dilanggar):
1. Spec berbahasa Indonesia, markdown, dengan bagian: Ringkasan, Keputusan Teknis, dan untuk SETIAP story tulis "Kriteria Selesai" yang konkret dan bisa diverifikasi.
2. Stories HANYA berasal dari fitur/keputusan yang ada di PRD — jangan mengarang fitur baru. Hal yang ambigu jadikan catatan di spec, bukan story.
3. Setiap story cukup kecil untuk diselesaikan dalam satu sesi kerja, mandiri, dan berurutan logis (dependensi dulu).
4. Batas wajar: maksimal 8 stories. Jika PRD lebih besar, pecah bagian inti saja dan tulis sisanya sebagai catatan lanjutan di spec.
5. Bahasa Indonesia, judul story singkat, deskripsi 2-4 kalimat.

FORMAT RESPON: balas HANYA JSON valid tanpa pembungkus markdown fence, dengan bentuk:
{"spec_markdown": "<isi spec lengkap dalam markdown>", "stories": [{"title": "judul story", "description": "deskripsi singkat story"}]}`;

export interface ParsedStory {
  title: string;
  description: string;
}

export interface SpecAiResponse {
  spec_markdown: string;
  stories: ParsedStory[];
}

/**
 * Parse & harden respons AI: strip fence, validasi field.
 * Fail-closed: throw Error ramah-user — route mengubahnya menjadi 502 tanpa
 * menyimpan spec/stories. Array kosong ditolak (spec tanpa story tidak layak
 * dilewati review — meracuni story 5/6).
 */
export function parseSpecResponse(rawText: string): SpecAiResponse {
  let text = (rawText || '').trim();

  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Hasil pecahan AI tidak valid (bukan JSON). Silakan coba lagi.');
  }

  const obj = parsed as Record<string, unknown>;
  const spec = typeof obj.spec_markdown === 'string' ? obj.spec_markdown.trim() : '';
  if (!spec) {
    throw new Error('Hasil pecahan AI kosong. Silakan coba lagi.');
  }

  if (!Array.isArray(obj.stories) || obj.stories.length === 0) {
    throw new Error('Hasil pecahan AI tidak memuat story sama sekali. Silakan coba lagi.');
  }

  const stories: ParsedStory[] = [];
  for (const s of obj.stories) {
    const item = s as Record<string, unknown>;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const description = typeof item.description === 'string' ? item.description.trim() : '';
    if (!title || !description) {
      throw new Error('Hasil pecahan AI tidak valid (ada story tanpa judul/deskripsi). Silakan coba lagi.');
    }
    stories.push({ title, description });
  }

  return { spec_markdown: spec, stories };
}

export function buildSpecMessages(prdContent: string): AIMessage[] {
  return [
    {
      role: 'user',
      content: `Berikut PRD yang sudah disetujui:\n\n${prdContent}\n\nSusun spec + pecah menjadi stories sesuai aturan system prompt.`,
    },
  ];
}
