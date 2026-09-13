import { AIMessage } from './types';

/**
 * System prompt drafter PRD untuk wizard Planning (Story 3 Meja Kendali).
 *
 * Kualitas draf wajib (hasil elicitation + party-mode review):
 * 1. Bagian `## Cakupan Fitur dari Brief` — menaftar SETIAP fitur yang
 *    teridentifikasi dari brief, sehingga reviewer bisa mencocokkan
 *    brief ↔ PRD secara visual (bukan draf generik).
 * 2. Daftar pertanyaan kritis yang belum dijawab user — bagian yang
 *    mengubah "draf yang bisa disetujui" menjadi "draf yang layak dipertanyakan".
 */

export const QUESTIONS_HEADING = '## Pertanyaan Kritis Belum Terjawab';
export const QUESTIONS_EMPTY = '(Tidak ada — semua asumsi kunci sudah tertutup oleh brief.)';

export const PRD_SYSTEM_PROMPT = `Kamu adalah drafter PRD (Product Requirements Document) untuk vibecoder non-IT.
Tugas: mengubah brief mentah dari user menjadi draf PRD berbahasa Indonesia yang terstruktur.

ATURAN WAJIB (jangan dilanggar):
1. Buka bagian "## Cakupan Fitur dari Brief" di awal PRD: daftar poin berisi SETIAP fitur/kemampuan yang tersirat maupun tersurat disebut dalam brief. Jangan melewatkan satu pun — jika brief menyebut fitur secara samar, masukkan dengan tanda (perlu klarifikasi).
2. Buat bagian "${QUESTIONS_HEADING}": daftar pertanyaan spesifik yang jawabannya mengubah desain (pengguna, biaya, data sensitif, integrasi, skala). Kosong HANYA jika benar-benar tidak ada yang menggantung.
3. Isi bagian standar PRD: Latar Belakang, Tujuan, Pengguna, Fitur (rinci per fitur), Di Luar Cakupan (non-goals), Kriteria Berhasil.
4. Jangan mengarang fitur yang tidak disebut brief — itu masuk pertanyaan kritis, bukan PRD.
5. Bahasa Indonesia, markdown, ringkas dan konkret.

FORMAT RESPON: balas HANYA JSON valid tanpa pembungkus markdown fence, dengan bentuk:
{"prd_markdown": "<isi PRD lengkap dalam markdown>", "open_questions": ["pertanyaan 1", "pertanyaan 2"]}`;

export interface PrdAiResponse {
  prd_markdown: string;
  open_questions: string[];
}

/**
 * Parse & harden respons AI: strip code fence markdown, validasi field.
 * Throw Error dengan pesan ramah-user bila tidak valid — pemanggil route
 * mengubahnya menjadi 502 tanpa menyimpan artifact.
 */
export function parsePrdResponse(rawText: string): PrdAiResponse {
  let text = (rawText || '').trim();

  // Strip code fence: AI kadang membungkus JSON dalam ```json ... ```
  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenceMatch) {
    text = fenceMatch[1].trim();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Draf AI tidak valid (bukan JSON). Silakan coba lagi.');
  }

  const obj = parsed as Record<string, unknown>;
  const prd = typeof obj.prd_markdown === 'string' ? obj.prd_markdown.trim() : '';
  if (!prd) {
    throw new Error('Draf AI kosong. Silakan coba lagi.');
  }
  if (!Array.isArray(obj.open_questions)) {
    throw new Error('Draf AI tidak valid (daftar pertanyaan kritis hilang). Silakan coba lagi.');
  }
  // Ketat sesuai spec: elemen non-string ditolak (502), bukan disaring diam-diam (EC-5)
  const allStrings = (obj.open_questions as unknown[]).every((q) => typeof q === 'string');
  if (!allStrings) {
    throw new Error('Draf AI tidak valid (pertanyaan kritis bukan teks). Silakan coba lagi.');
  }
  const questions = (obj.open_questions as string[]).filter((q) => q.trim().length > 0);

  return { prd_markdown: prd, open_questions: questions };
}

/**
 * Gabungkan hasil AI menjadi satu konten markdown artifact:
 * pertanyaan kritis sebagai blok tersendiri di akhir — bukan catatan kaki.
 */
export function composePrdContent(ai: PrdAiResponse): string {
  const questionBlock =
    ai.open_questions.length > 0
      ? `\n\n${QUESTIONS_HEADING}\n\n${ai.open_questions.map((q) => `- ${q}`).join('\n')}`
      : `\n\n${QUESTIONS_HEADING}\n\n- ${QUESTIONS_EMPTY}`;
  return ai.prd_markdown.trimEnd() + questionBlock;
}

export function buildPrdMessages(brief: string): AIMessage[] {
  return [{ role: 'user', content: `Berikut brief saya:\n\n${brief}\n\nSusun draf PRD sesuai aturan system prompt.` }];
}
