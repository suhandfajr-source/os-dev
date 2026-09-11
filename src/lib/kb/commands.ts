/**
 * Parser perintah chat untuk Kelola Knowledge Base (CAP-4).
 * Desain: ambang ketat — perintah ambigu DIBIARKAN lewat ke AI sebagai obrolan biasa,
 * jangan pernah menebak untuk menghapus/mengubah data (lihat chat-flows.md).
 */

export type KbCommand =
  | { action: 'list' }
  | { action: 'show'; name: string }
  | { action: 'delete'; name: string };

const MAX_COMMAND_LENGTH = 120;

export function parseKbCommand(text: string): KbCommand | null {
  const t = (text || '').trim();
  if (!t || t.length > MAX_COMMAND_LENGTH) return null;
  const lower = t.toLowerCase();

  // LIST: "tools apa aja yang gua simpan?", "lihat dokumentasi", "entri apa aja"
  if (
    /((tools?|entri|istilah|dokumentasi|kb|kamus)\s+(apa aja|apa saja))/.test(lower) ||
    /(apa aja|apa saja)\s+(yang\s+)?(udah|sudah|pernah|aku|gua|saya)?\s*(gu[ai]|aku|saya)?\s*(simpan|save|catat)/.test(lower) ||
    /^((lihat|buka|list|cek)\s+)?(dokumentasi|kb|koleksi)(\s+(tools?|entri|aku|gua|saya))?\??$/.test(lower)
  ) {
    return { action: 'list' };
  }

  // DELETE: wajib ada konteks dokumentasi/entri/kb di pesan, contoh:
  // "hapus git stash dari dokumentasi", "hapus entri tmux", "delete kb docker"
  const hasKbContext = /(dokumentasi|kb|entri)/i.test(t);
  const delMatch = t.match(/^(?:hapus|delete|buang)\s+(?:entri\s+|tools?\s+)?(.+?)(?:\s+dari\s+(?:dokumentasi|kb|koleksi))?\s*[?.!]*$/i);
  if (hasKbContext && delMatch) {
    const name = delMatch[1].trim();
    if (name && !/^(semua|all|dokumentasi|kb|entri)\b/i.test(name)) {
      return { action: 'delete', name };
    }
  }

  // SHOW: "lihat entri git stash", "detail entri docker"
  const showMatch = t.match(/^(?:lihat|tampilkan|buka|detail)\s+entri\s+(.+?)[?.!]*$/i);
  if (showMatch) {
    const name = showMatch[1].trim();
    if (name) return { action: 'show', name };
  }

  return null;
}
