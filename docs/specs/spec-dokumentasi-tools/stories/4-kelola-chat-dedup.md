---
title: 'S4 — Kelola via chat + dedup/update (CAP-4, CAP-5)'
type: 'feature'
created: '2026-09-11'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
context:
  - 'docs/specs/spec-dokumentasi-tools/SPEC.md'
  - 'docs/specs/spec-dokumentasi-tools/chat-flows.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** User tidak punya cara melihat, melihat detail, dan menghapus entri KB lewat chat (CAP-4); dan menanyakan tools yang sama dua kali berisiko membuat entri ganda (CAP-5).

**Approach:** Parser perintah chat ber-ambang ketat (`list` / `show` / `delete`) dijalankan di `/api/chat` sebelum panggilan AI — perintah dikenali dijawab server-side tanpa kuota AI; perintah ambigu diteruskan ke AI sebagai obrolan biasa. Delete selalu memunculkan chips konfirmasi ulang (`Ya, Hapus` / `Batal`). Simpan dengan nama yang sudah ada → **update entri lama** + tag "Diperbarui di Dokumentasi".

</frozen-after-approval>

## Code Map

- `src/lib/kb/commands.ts` -- BARU: `parseKbCommand` (list/show/delete; wajib konteks "dokumentasi|kb|entri" untuk delete; guard "hapus semua" ditolak; maks 120 char).
- `src/app/api/chat/route.ts` -- `handleKbCommand` (tanpa AI): list → bubble daftar; show → bubble detail 4 field; delete → bubble konfirmasi + `kb_confirm` di payload; empty state → ajakan simpan entri pertama.
- `src/app/api/knowledge/route.ts` -- aksi baru `confirm_delete` / `cancel_delete` (idempotent 409); save kini dedup via `updateKnowledgeEntry`.
- `src/lib/db/index.ts` -- `updateKnowledgeEntry`, `getKnowledgeEntries`, `findKnowledgeEntriesByName`, `deleteKnowledgeEntry` (FTS tersinkron otomatis via trigger S1).
- `src/components/chat/MessageItem.tsx` -- `DeleteConfirmChips` (pending → chips; confirmed → tag "terhapus"; cancelled → hilang) + tag "Diperbarui di Dokumentasi".
- `src/components/chat/ChatContainer.tsx` -- `handleKbConfirm` (POST keputusan + update payload lokal).

## Implementation Notes

- Bubble sistem memakai persona `Gib-run` (fallback native `getPersonaDetails`) — tanpa komponen/avatar baru (Lock #4).
- Perintah kelola TIDAK memanggil AI sama sekali — konsisten constraint hemat kuota.
- Verifikasi: `npx tsc --noEmit` lulus; unit test parser 12/12 lulus (termasuk guard ambigu: "hapus file ini dong", "tolong hapus branch lama dari repo", "hapus semua" → bukan perintah KB).
- Catatan deferred dari S1 tetap berlaku: penghapusan via `deleteKnowledgeEntry` tidak menyentuh `updated_at` (tak relevan untuk delete).

## Review Triage Log

- Parser salah menangkap kalimat user yang mengandung kata "hapus/entri" di luar konteks KB — verdict: mitigated — delete mewajibkan konteks dokumentasi/kb/entri + 12 kasus uji negatif lulus; salah tangkap paling buruk berujung konfirmasi ulang, tidak pernah hapus langsung.
- "hapus semua" bisa menghapus seluruh KB — verdict: false — di-guard eksplisit, dikembalikan sebagai obrolan biasa.
- `findKnowledgeEntriesByName` LIKE bisa match sebagian nama lain — verdict: low (accepted) — delete selalu butuh konfirmasi chips, user melihat nama persis sebelum konfirmasi; multi-match memilih entri terbaru.
