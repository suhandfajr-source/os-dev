---
title: 'S3 — Recall hemat via FTS + suntik prompt (CAP-3)'
type: 'feature'
created: '2026-09-11'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
context:
  - 'docs/specs/spec-dokumentasi-tools/SPEC.md'
  - 'docs/specs/spec-dokumentasi-tools/chat-flows.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** KB yang tersimpan tidak pernah tersentuh saat user bertanya lagi — recall pasif membuat fitur gagal diam-diam (CAP-3).

**Approach:** Sebelum prompt dikirim ke AI, jalankan pencarian FTS lokal (`searchKnowledge` dari S1, sudah ada) atas pesan user; bila ada kecocokan (mulai ketat, limit 3), suntikkan entri ke system prompt sebagai "CATATAN TERSIMPAN DARI KNOWLEDGE BASE USER" dengan instruksi "sebutkan hanya jika benar-benar relevan, jangan dipaksakan". Tanpa kecocokan → alur identik dengan sekarang, nol panggilan AI tambahan.

</frozen-after-approval>

## Implementation Notes

- `src/lib/db/index.ts` -- `searchKnowledge()` (FTS5 MATCH, token di-quote aman, try/catch → `[]`); sudah dibuat di commit S1/S2, dipakai di sini.
- `src/app/api/chat/route.ts` -- sebelum panggilan provider: `searchKnowledge(content)` bila ada teks; hasil diformat ringkas dan dioper sebagai `knowledgeContext` ke `buildSystemPrompt` (param baru, S2).
- Mode revisi KB (`kbEdit`) tetap berjalan; `knowledgeContext` tidak mengganggunya (section prompt terpisah).
- Verifikasi: `npx tsc --noEmit` lulus; smoke test `searchKnowledge` semantics (quote-token, FTS match, error → []) sudah tercakup smoke test S1 + unit query di bawah.

## Review Triage Log

- Query FTS dengan karakter khusus (tanda kutip, operator) bisa error — verdict: false — token di-quote per-kata dan dibuang kutipnya; try/catch mengembalikan [].
- Recall menambah latensi besar — verdict: false — satu query FTS lokal (milidetik), tanpa panggilan AI tambahan.
