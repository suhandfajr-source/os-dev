---
title: 'Wizard Planning — PRD ke Spec + Stories'
type: 'feature'
created: '2026-09-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '3413c4f'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Loop inti planning berhenti di PRD — PRD yang sudah disetujui belum dipecah menjadi spec + daftar stories, padahal itulah bahan baku story board (story 5) dan paket handoff (story 6). Ini **single point of failure loop inti**: hasil pecahan yang buruk meracuni semua story berikutnya.

**Approach:** Lanjutan wizard di `/dashboard/[projectId]`: dengan PRD `approved`, AI (tier berat, `AI_MODEL`) memecah PRD menjadi **spec artifact** (type=`spec`, draft) + **daftar stories** (tabel `story` per kontrak skema, status `draft`) — keduanya melewati review/edit/approve user per item. Kualitas wajib: spec memuat bagian kriteria selesai per story, dan setiap story benar-benar berasal dari PRD (bukan karangan) — hasil pecahan wajib direview user (spec_checkpoint).

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Panggilan AI via `getAIProvider().generateResponse` existing, `responseMimeType: application/json` — tanpa provider/library baru.
- **Prasyarat:** PRD harus status `approved` — tidak approved → 409; spec sudah `approved` → 409 (regenerate terkunci); ada story `approved` → 409 (regenerate tidak boleh menghapus keputusan user).
- Spec & stories disimpan via **upsert/replace atomik**: satu spec per proyek (type=`spec`); regenerate menimpa spec draft + mengganti seluruh rows `story` (delete + insert dalam satu `client.batch`).
- `updated_at` eksplisit (`strftime %f`) di semua path tulis; approve ulang = no-op aman tanpa menyentuh `updated_at`.
- Validasi respons AI harden: strip fence, tolak `spec_markdown` kosong, tolak `stories` bukan array / array kosong / elemen tanpa `title` & `description` string non-kosong → 502 tanpa menyimpan apa pun.
- PATCH story: abaikan field tak dikenal (termasuk percobaan injeksi `status`/`order`); batas panjang `title` ≤ 200 dan `description` ≤ 20.000 karakter → lebih dari itu 400.
- Brief tetap bisa disimpan kapan saja via jalur `skipAi` yang sudah ada (tidak tersentuh story ini).

**Never:**
- Jangan mengubah perilaku chat/provider/endpoint story 1–3 (PATCH & approve artifact generik tetap berlaku untuk spec).
- Jangan membuat tabel/kolom baru di luar kontrak skema (tabel `story` dibuat di story ini sesuai kontrak: id, project_id, title, description, status, order, timestamps).
- Jangan memanggil AI di jalur approve/edit (murni DB).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Draf spec + stories pertama | POST `/api/projects/[id]/draft-spec`, PRD `approved` | AI dipanggil → artifact type=`spec` draft + rows `story` (status=`draft`, `order` berurutan) tersimpan, 200 `{specArtifact, stories}` | project tidak ada → 404; PRD belum approved → 409; AI gagal/JSON tak valid → 502 — tidak ada spec/stories tersimpan |
| Regenerate (spec draft, tanpa story approved) | POST sama | Spec ditimpa (upsert), seluruh stories lama diganti rows baru, `updated_at` baru | — |
| Regenerate terkunci | POST sama, spec `approved` ATAU ada story `approved` | **409** `{error}` — tidak ada perubahan | — |
| Edit story | PATCH `/api/stories/[id]` `{title?, description?}` | 200 `{story}`, `updated_at` eksplisit | id tidak ada → 404; story `approved` → 409; title/description kosong atau melebihi batas (200 / 20.000) → 400 |
| Approve story | POST `/api/stories/[id]/approve` | 200 `{story}` status=`approved`; approve ulang → 200 tanpa `updated_at` berubah | id tidak ada → 404 |
| Lihat stories | GET `/api/projects/[id]/stories` | 200 `{stories: [...]}` urut `order` ASC | project tidak ada → 404 |
| Approve spec | POST `/api/artifacts/[specId]/approve` (endpoint existing) | 200 — spec terkunci | id tidak ada → 404 |
| AI kembalikan `stories` array kosong | POST `/api/projects/[id]/draft-spec`, PRD `approved` | — | 502 tanpa menyimpan apa pun (spec tanpa story tidak layak dilewati review) |

## Code Map

- `src/lib/db/index.ts` -- pola upsert atomik `upsertPrdArtifact` (R1 story 3) ditiru untuk `upsertSpecArtifact`; tambah `replaceStories` (client.batch), `listStories`, `getStoryById`, `updateStory`, `approveStory`; tabel `story` dibuat di `doInitialize` sesuai kontrak. **Catatan teknis:** kolom `order` adalah reserved keyword SQLite — wajib dikutip sebagai `"order"` di semua query; `replaceStories` menomor ulang `order` 0..N-1 deterministik.
- `src/lib/ai/prd-prompt.ts` -- pola system prompt + `parsePrdResponse` + konstanta heading ditiru; file baru `src/lib/ai/spec-prompt.ts` untuk prompt pecah PRD + `parseSpecResponse`.
- `src/app/api/projects/[id]/draft-prd/route.ts` -- pola guard berlapis (404 → 409 → AI → parse → upsert atomik → 409 lanjutan).
- `src/app/api/artifacts/[id]/approve/route.ts` -- approve spec memakai endpoint generik existing.
- `src/app/dashboard/[projectId]/page.tsx` -- wizard ditambah "Langkah 3" (muncul saat PRD approved): tombol pecah PRD, editor spec, daftar story dengan edit/approve per story; tombol disabled saat generating.
- `src/app/api/projects/[id]/draft-spec/route.ts`, `src/app/api/projects/[id]/stories/route.ts`, `src/app/api/stories/[id]/route.ts`, `src/app/api/stories/[id]/approve/route.ts` -- BARU.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- tipe `Story`, `StoryStatus` ('draft' | 'approved') -- kontrak tipe.
- [x] `src/lib/db/index.ts` -- tabel `story` + `upsertSpecArtifact`, `replaceStories`, `listStories`, `getStoryById`, `updateStory`, `approveStory` -- lapisan data.
- [x] `src/lib/ai/spec-prompt.ts` -- prompt pecah PRD (kriteria selesai per story; stories hanya dari PRD) + `parseSpecResponse` harden -- logika prompt terpusat.
- [x] `src/app/api/projects/[id]/draft-spec/route.ts` + `.../stories/route.ts` + `src/app/api/stories/[id]/route.ts` + `.../approve/route.ts` -- endpoint.
- [x] `src/app/dashboard/[projectId]/page.tsx` -- Langkah 3 wizard: pecah PRD → review/edit spec & stories → approve per item; indikator jumlah story approved.
- [x] `tests/api/spec-stories.spec.ts` -- test endpoint (guard 409 berlapis, replace stories, approve-ulang, PATCH approved, PATCH field tak dikenal diabaikan, parse fail path via seed, tolak `stories` kosong).

**Acceptance Criteria:**
- Given PRD `approved`, when tombol pecah PRD ditekan, then artifact `spec` draft + daftar stories draft tersimpan dan tampil di wizard.
- Given spec/stories draft, when user mengedit lalu menyetujui spec dan story satu per satu, then status masing-masing jadi `approved` dan tersimpan (persisten setelah reload).
- Given PRD belum `approved` (atau spec sudah `approved` / ada story `approved`), when draf spec diminta, then 409 tanpa perubahan apa pun.
- Given AI gagal/JSON tidak valid, when draf spec diminta, then 502 ramah-user dan TIDAK ada spec/stories tersimpan (PRD tetap utuh).
- Given story `approved`, when di-PATCH, then 409; given approve ulang, then `updated_at` tidak berubah.
- Given AI mengembalikan `stories` array kosong, when draf spec diminta, then 502 dan tidak ada yang tersimpan.
- Given spec draft tersimpan, when user mereview sebelum approve, then spec memuat bagian kriteria selesai per story dan tiap story dapat ditelusuri ke PRD (pemeriksaan manual — prasyarat approve).
- Given regenerate, when rows story baru ditulis, then `order` 0..N-1 tanpa duplikat dan GET stories kembali urut deterministik.
- Given WhatsApp mode & fitur story 1-3 dipakai normal, then tidak ada regresi (suite penuh hijau).

## Implementation Notes
- Semua task selesai. Verifikasi smoke AI asli ("kasir warung"): PRD approved → draft-spec 200 → spec draft + 5 stories (order 0..4, kriteria selesai ada, semua story telusur ke PRD) → approve 1 story → regenerate 409 → PATCH story approved 409 → cleanup cascade bersih.
- Temuan implementasi: draft-spec tidak membutuhkan body — validasi body dipindah setelah guard berlapis (test menangkap 400 sebelum 409); perbaikan mengikuti I/O Matrix.
- Keputusan implementasi: kolom `"order"` selalu dikutip di semua query story (reserved keyword SQLite) — di CREATE TABLE, index, ORDER BY, dan PATCH-guard (field diabaikan).
- Keputusan implementasi: UI Langkah 3 muncul hanya saat PRD approved; konfirmasi regenerate + peringatan approve-story-pertama adalah window.confirm (lapisan UX sesuai Design Notes).

## Spec Change Log

## Review Triage Log

### Iterasi 1 — 2026-09-13 — advanced elicitation (5 metode: pre-mortem, critique & refine, boundary sweep, assumption audit, stakeholder lens)
- **[AC gap — diterapkan]** Kualitas wajib "spec memuat kriteria selesai per story" + "stories dari PRD" ada di Intent tapi tanpa acceptance criteria → ditambahkan 2 AC (kriteria per story; traceability manual sebagai prasyarat approve).
- **[Bug validasi — diterapkan]** `stories: []` lolos validasi lama (array kosong bukan "bukan array") → spec tersimpan tanpa story, meracuni story 5/6 → harden: tolak array kosong → 502; AC + test case ditambah.
- **[Jebakan teknis — diterapkan]** Kolom `order` = reserved keyword SQLite → catatan kutip `"order"` di Code Map; kebijakan renumber 0..N-1 + AC deterministik urutan.
- **[Pre-mortem kehilangan data — diterapkan]** Regenerate menimpa SEMUA story draft termasuk editan user tanpa konfirmasi → keputusan UI: konfirmasi sebelum regenerate saat ada editan draft.
- **[Pre-mortem jebakan urutan — diterapkan]** Approve story saat spec masih draft mengunci regenerasi permanen tanpa peringatan → keputusan UI: peringatan sebelum approve story pertama.
- **[Edge case — diterapkan]** PATCH tanpa batas panjang & field tak dikenal (injeksi `status`/`order`) → batas title 200 / description 20.000 → 400; field tak dikenal diabaikan; test case ditambah.
- **[Assumption audit — dicatat]** Asumsi "1 panggilan AI cukup" berisiko truncation di PRD panjang — mitigasi prompt + fail-closed; solusi per-bagian ditunda ke R2 (dicatat di Design Notes, bukan scope story ini).
- **[Stakeholder lens — diverifikasi]** Kebutuhan story 5 (konsumsi tabel `story`) & story 6 (kriteria selesai di spec) sudah terakomodasi; keputusan tanpa kolom `stage` dicatat eksplisit di Design Notes.
- **[Diverifikasi akurat]** Code Map cocok dengan kode (baseline `3413c4f`): `upsertPrdArtifact`, `parsePrdResponse`, `client.batch`, pola guard 409 berlapis, `skipAi` — tidak ada koreksi.

## Design Notes

- Keputusan penyimpanan stories: tabel `story` (bukan artifact type=story) — sesuai kontrak skema; story board (story 5) dan handoff (story 6) mengonsumsi tabel ini.
- Keputusan status story: `draft` | `approved` — konsisten dengan artifact; board status (todo/selesai) adalah domain story 5.
- Keputusan regenerasi: mengganti SEMUA story (spec induknya diganti) — tapi terkunci bila ada story yang sudah user-setujui (mencegah kehilangan keputusan user).
- Keputusan approve spec: memakai endpoint artifact generik — spec adalah artifact, bukan entitas baru.
- Keputusan respons AI: `{ "spec_markdown": string, "stories": [{ "title": string, "description": string }] }`.
- Keputusan urutan approve: story boleh di-approve saat spec masih draft (per item independen) — tapi approve story pertama = regenerasi terkunci permanen; UI wajib memperingatkan konsekuensi ini sebelum approve story pertama (mencegah keputusan menyesal tanpa jalan keluar).
- Keputusan regenerasi UI: tombol regenerate meminta konfirmasi ketika ada story draft yang sudah diedit user — mencegah editan berjam-jam hilang tanpa peringatan (server tetap replace penuh; ini lapisan UX, bukan guard API).
- Asumsi yang di-stress-test: satu panggilan AI cukup untuk spec penuh + semua story (risiko truncation di PRD panjang) — dimitigasi prompt (batas wajar jumlah story) + parse fail-closed → 502; jika di lapangan sering gagal, pecahan per-bagian jadi kandidat R2, bukan dibangun prematur di sini.
- Skema tabel `story` cukup untuk story 5 & 6: tidak ada kolom `stage` (semua story adalah backlog development R1) dan status board (todo/selesai) adalah domain story 5 — story ini sengaja tidak menyediakannya.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: bersih.
- `npx playwright test` -- expected: semua lulus (story 1-3 + test baru; tanpa regresi).

**Manual checks:**
- Dengan PRD approved (story 3): pecah PRD → spec + stories muncul; cek spec memuat kriteria selesai & stories berasal dari PRD → edit story → approve spec + beberapa story → reload: persisten.
- Guard: coba pecah saat PRD draft → 409; approve satu story lalu pecah ulang → 409.
- Cek manual sebelum approve spec: spec memuat kriteria selesai per story dan tiap story benar-benar merujuk bagian PRD (bukan karangan AI).
- Cek peringatan UI: approve story pertama menampilkan peringatan terkunci-regenerasi; regenerate dengan editan draft menampilkan konfirmasi.
- Cek batas: PATCH title 201 karakter → 400; title 200 → 200.
