---
title: 'S2 — Simpan terkonfirmasi + entri 4 field (CAP-1, CAP-2)'
type: 'feature'
created: '2026-09-11'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
context:
  - 'docs/specs/spec-dokumentasi-tools/SPEC.md'
  - 'docs/specs/spec-dokumentasi-tools/chat-flows.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mesin belum menawarkan penyimpanan entri KB — jawaban tentang tools menguap begitu saja; user tidak punya cara mengeklik "Simpan 📦" di dalam chat (CAP-1, CAP-2).

**Approach:** AI menyertakan objek `knowledge_entry` (4 field, bahasa awam) pada jawaban yang menjelaskan tool/library/layanan/konsep. Frontend merender chips `Simpan 📦 / Edit / Skip` gaya WhatsApp di bawah bubble. Simpan/Skip memanggil API baru yang menulis ke `knowledge_entries` (S1) dan menandai status di `response_payload` pesan. Chip `Edit` memicu mode revisi via pesan chat berikutnya, lalu AI menawarkan simpan ulang.

## Boundaries & Constraints

**Always:**
- Entri hanya tercipta dari aksi eksplisit user pada chips; tidak pernah auto-save.
- Chips & indikator memakai gaya komponen chat WhatsApp eksisting (bubble `#202c33`, pill, warna `#25d366`/`#00a884`); tanpa komponen UI baru di luar bubble chat.
- Status chips persisten: setelah reload, "Simpan" tidak muncul lagi untuk pesan yang sudah saved/skipped.
- Entri 4 field wajib terisi (name, function_summary, when_to_use, how_to_start) + type; ditulis AI dalam bahasa awam.

**Never:**
- Tidak membuat tab/halaman/layar baru; tidak ada form inline.
- Tidak ada dedup/deduplikasi & recall FTS (S3–S4); S2 boleh insert walau nama sudah ada.
- Tidak mengubah perilaku jawaban non-tools (tanpa `knowledge_entry` → tanpa chips).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Jawaban tools | AI mengembalikan `knowledge_entry` valid | Chips tampil di bawah bubble | N/A |
| Jawaban non-tools | Payload tanpa `knowledge_entry` | Tidak ada chips | N/A |
| `knowledge_entry` tidak valid | Zod parse gagal | Jalur fallback eksisting; tanpa chips | Dihapus dari payload, jawaban tetap tampil |
| Klik Simpan | POST /api/knowledge action=save | Entri masuk `knowledge_entries`; status `saved`; tag "📦 Tersimpan" | Gagal → error banner, chips tetap |
| Klik Skip | action=skip | Status `skipped`; chips hilang permanen | Sama |
| Klik Edit lalu kirim revisi | Pesan berikutnya + `kbEdit` metadata | AI merevisi entri & menawarkan simpan ulang (chips baru di jawaban revisi) | Batal edit → chip ✕ di banner konteks |
| Double-click / spam Simpan | Status sudah `saved` | API menolak (409), UI tidak berubah | Idempotent |

</frozen-after-approval>

## Code Map

- `src/lib/ai/prompt-builder.ts` -- BASE_SYSTEM_PROMPT (aturan JSON blocks); tambah instruksi `knowledge_entry` + mode revisi; `buildSystemPrompt` sudah menerima `behaviorContext`.
- `src/lib/ai/validator.ts` -- `AssistantResponseSchema` (zod); tambah schema optional `knowledge_entry`; fallback path harus tetap aman.
- `src/types/index.ts` -- `AssistantResponsePayload`, `KnowledgeEntry` (S1); tambah `PendingKnowledgeEntry` + `knowledge_status`.
- `src/lib/db/index.ts` -- pola helper (addMessage, touchConversation); tambah `createKnowledgeEntry`, `updateMessagePayload`.
- `src/app/api/chat/route.ts` -- alur single-pass POST; terima `kbEdit` dari body, sisipkan konteks revisi ke system prompt, simpan payload (chips status default `pending`).
- `src/app/api/knowledge/route.ts` -- BARU: POST {messageId, action, entry?}; save→insert+update payload; skip→update payload; idempotent terhadap status.
- `src/components/chat/MessageItem.tsx` -- render bubble + payload; tambah baris chips/tag di bawah blok, callback prop `onKbAction`.
- `src/components/chat/ChatContainer.tsx` -- owner state `messages`; handler `handleKbAction` (fetch API + update state lokal) + state mode revisi (banner konteks di atas composer).

## Tasks & Acceptance

**Execution:**
- [ ] `src/types/index.ts` -- tambah `PendingKnowledgeEntry`, `knowledge_status`, ekstensi `AssistantResponsePayload` -- kontrak lintas-layer
- [ ] `src/lib/ai/validator.ts` -- schema optional `knowledge_entry` (4 field + type required, string non-kosong) -- gerbang validasi
- [ ] `src/lib/ai/prompt-builder.ts` -- instruksi `knowledge_entry` + mode revisi via KONTEKS PERCAKAPAN -- sumber perilaku AI
- [ ] `src/lib/db/index.ts` -- `createKnowledgeEntry`, `updateMessagePayload` -- akses data
- [ ] `src/app/api/chat/route.ts` -- terima & oper `kbEdit`, simpan payload dengan `knowledge_status: 'pending'` -- pipeline
- [ ] `src/app/api/knowledge/route.ts` -- BARU, POST save/skip idempotent -- aksi chips
- [ ] `src/components/chat/MessageItem.tsx` -- chips/tag + prop callback -- UI
- [ ] `src/components/chat/ChatContainer.tsx` -- `handleKbAction` + banner mode revisi -- orkestrasi state

**Acceptance Criteria:**
- Given jawaban AI berisi `knowledge_entry`, when pesan dirender, then chips `Simpan 📦 / Edit / Skip` tampil di bawah bubble bergaya WhatsApp.
- Given user menekan Simpan, when POST sukses, then satu baris baru ada di `knowledge_entries` dengan 4 field terisi, chips berganti tag "📦 Tersimpan", dan setelah reload status tetap.
- Given user menekan Skip, when POST sukses, then tidak ada baris baru di KB dan chips tidak muncul lagi.
- Given user menekan Edit, when user mengirim pesan revisi berikutnya, then jawaban AI memuat `knowledge_entry` hasil revisi dengan chips simpan ulang.
- Given jawaban tanpa topik tools, when dirender, then tidak ada chips dan UI identik dengan sekarang.

## Implementation Notes

## Spec Change Log

## Review Triage Log
