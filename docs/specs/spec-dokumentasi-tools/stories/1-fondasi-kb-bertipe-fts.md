---
title: 'S1 — Fondasi KB bertipe + FTS index di libSQL'
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

**Problem:** Aplikasi belum punya penyimpanan untuk knowledge base "Dokumentasi Tools" — CAP-1..CAP-5 (SPEC) semuanya butuh satu sumber data bertipe yang bisa dicari full-text secara lokal sebelum panggilan AI.

**Approach:** Tambahkan satu tabel `knowledge_entries` (kolom `type` extensible: tool/library/layanan/konsep; entri 4 field) plus virtual table FTS5 yang tersinkron lewat trigger, dibuat secara aditif & idempotent di jalur inisialisasi DB yang sudah ada. Tanpa dependency baru, tanpa perubahan UI, tanpa fungsi API baru (S2–S4 menyusul).

</frozen-after-approval>

## Implementation Notes

- Skema dibuat via `ensureDbInitialized()` (pola `CREATE TABLE IF NOT EXISTS` + PRAGMA yang sudah ada) sehingga aman terhadap `data/assistant.db` yang live.
- Kolom mengikuti konvensi snake_case eksisting: `name`, `function_summary` (fungsi, bahasa awam), `when_to_use` (kapan dipakai), `how_to_start` (cara mulai), `type` (tool/library/layanan/konsep), plus `created_at`, `updated_at`.
- FTS5: virtual table `knowledge_fts` dengan kolom teks 4 field + `type`; sinkron via trigger AFTER INSERT/UPDATE/DELETE pada `knowledge_entries`.
- `src/lib/db/schema.sql` disamakan sebagai referensi (mirror dari inisialisasi kode, pola eksisting).
- Tipe TS `KnowledgeEntry` + `KnowledgeEntryType` ditambahkan di `src/types/index.ts` untuk dipakai S2–S4.
- Verifikasi: `npx tsc --noEmit` lulus; smoke test membuat client libSQL in-memory yang menjalankan DDL sama (tabel + FTS + trigger) lalu insert/select.
- Hasil implementasi: tsc lulus (exit 0); smoke test lulus — insert→FTS hit, update→FTS tersinkron, delete→FTS kosong, tipe baru tanpa migrasi.
- Review: runtime tanpa subagent → Blind Hunter dijalankan inline. 3 temuan: 2 false, 1 low (updated_at tak auto-update) di-defer ke `_bmad-output/implementation-artifacts/deferred-work.md` — S4 wajib set updated_at eksplisit.

## Review Triage Log

- updated_at tidak auto-update saat UPDATE — verdict: low (defer) — SQLite tak mendukung ON UPDATE; bukan cacat S1 karena fungsi update milik S4; tercatat di deferred-work.md.
- FTS butuh rebuild untuk data lama — verdict: false — knowledge_entries tabel baru, tanpa data legacy.
- Ambiguitas WHERE knowledge_fts MATCH saat JOIN — verdict: false — smoke test membuktikan query jalan.
