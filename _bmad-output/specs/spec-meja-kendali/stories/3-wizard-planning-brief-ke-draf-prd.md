---
title: 'Wizard Planning — Brief ke draf PRD'
type: 'feature'
created: '2026-09-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '37c9526c7cf59a557e515e93c5d61889921510dc'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Tahap Planning di Meja Kendali belum punya wizard — user belum bisa mengubah ide mentah (brief) menjadi draf PRD yang terstruktur dengan bantuan AI, lalu menyetujuinya sebagai artefak (CAP-3 + CAP-5). Ini wizard pertama; polanya akan ditiru wizard berikutnya.

**Approach:** Halaman detail proyek `/dashboard/[projectId]` berisi wizard Planning: user mengisi brief → brief **disimpan dulu sebagai artifact** → AI (tier berat, `AI_MODEL`) mendraf PRD → user me-review, mengedit, lalu menyetujui. Kegagalan AI tidak menghilangkan brief. Kualitas draf wajib: PRD memuat bagian **`## Cakupan Fitur dari Brief`** yang menaftar setiap fitur yang teridentifikasi dari brief, plus **daftar pertanyaan kritis** yang ditampilkan sebagai blok tersendiri di wizard — bukan draf generik yang sekadar "bisa disetujui". Bentuk wizard/form, bukan chat-driven.

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Semua panggilan AI memakai `getAIProvider().generateResponse` existing dengan `responseMimeType: application/json` (pola `src/app/api/chat/route.ts`) — tanpa provider/library baru.
- Alur `draft-prd`: simpan/upsert `artifact` type=`brief` status=`draft` **lebih dulu**, baru panggil AI — kegagalan AI tidak menghapus brief.
- Satu brief dan satu PRD per proyek: fungsi DB untuk keduanya **upsert** terhadap artifact existing (bukan insert baru).
- `approve`: set status → `approved` dan set `updated_at` eksplisit (SQLite tanpa ON UPDATE); **approve ulang = 200 tanpa menyentuh `updated_at`**.
- Validasi respons AI sebelum dipakai: strip code fence markdown, parse JSON, tolak `prd_markdown` kosong dan `open_questions` bukan array-of-string → 502 tanpa artifact PRD tersimpan.
- Brief maksimal 8.000 karakter.

**Never:**
- Jangan mengubah perilaku chat WhatsApp existing atau provider `src/lib/ai/provider.ts`.
- Jangan memanggil AI di jalur non-draf (approve/edit = murni DB).
- Jangan membuat tabel/kolom baru di luar kontrak skema `architecture-diagrams.md`.
- Jangan mengizinkan draft baru untuk PRD yang sudah `approved` (tutup rantai status zombie — lihat Design Notes).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Draf PRD pertama | POST `/api/projects/[id]/draft-prd` `{brief}` (valid) | Brief tersimpan (upsert artifact type=`brief`) → AI dipanggil → artifact type=`prd` status=`draft` tersimpan, 200 `{briefArtifact, prdArtifact}` | brief kosong/whitespace → 400; brief > 8.000 char → 400; project tidak ada → 404; AI gagal/JSON tak valid → 502 `{error}` ramah-user — **brief tetap tersimpan, PRD tidak** |
| Regenerate (draft ada) | POST sama, PRD draft existing | Konten PRD draft ditimpa (upsert), status tetap `draft`, `updated_at` baru | 404 jika project tidak ada |
| Regenerate (PRD approved) | POST sama, PRD status=`approved` | **409** `{error: "PRD sudah disetujui"}` — tidak ada perubahan | — |
| Edit manual | PATCH `/api/artifacts/[id]` `{content}` | 200 `{artifact}`, `updated_at` eksplisit ter-set | content kosong/whitespace → 400; id tidak ada → 404 |
| Approve | POST `/api/artifacts/[id]/approve` | 200 `{artifact}` status=`approved`, `updated_at` baru; status tahap planning → `selesai` | id tidak ada → 404; approve ulang → 200, `updated_at` TIDAK berubah |
| Edit PRD approved | PATCH `/api/artifacts/[id]` status=`approved` | **409** `{error}` — konten terkunci | id tidak ada → 404 (dicek lebih dulu) |
| Approve artifact brief | POST approve pada type=`brief` | **409** — hanya PRD yang bisa approved | id tidak ada → 404 |
| Simpan brief saja | POST `draft-prd` `{brief, skipAi: true}` | 200 `{briefArtifact}` tanpa memanggil AI — legal bahkan saat PRD approved | brief kosong → 400 |
| Lihat artefak | GET `/api/projects/[id]/artifacts` | 200 `{artifacts: [...]}` — filter `?stage=`/`?type=` **tervalidasi terhadap union**; tak dikenal → diabaikan (kembalikan semua) | project tidak ada → 404 |

## Code Map

- `src/lib/ai/provider.ts` -- `getAIProvider()` + `generateResponse({systemPrompt, messages})`, JSON via `responseMimeType`, fallback chain rate-limit — JANGAN diubah; panggil apa adanya.
- `src/app/api/chat/route.ts:250` -- pola pemanggilan provider + penanganan error AI.
- `src/lib/db/index.ts` -- tabel `artifact` sudah ada; tambah fungsi CRUD artifact mengikuti pola existing (`upsert` untuk brief & PRD, `updated_at = strftime('%Y-%m-%d %H:%M:%f','now')` eksplisit di semua path tulis kecuali approve-ulang).
- `src/types/index.ts` -- tambah tipe `Artifact`, `ArtifactStage`, `ArtifactType`, `ArtifactStatus`.
- `src/app/dashboard/page.tsx` -- kartu proyek dibungkus Link ke detail; chip status tetap berfungsi.
- `src/app/dashboard/[projectId]/page.tsx` -- BARU: wizard Planning (form brief → draf PRD editable → approve); **blok "Pertanyaan Kritis" sebagai penekanan visual tersendiri**, bukan catatan kaki; tombol Setujui & Draf Ulang disabled saat generate berjalan (mitigasi race UI, single-user).
- `src/app/api/projects/[id]/draft-prd/route.ts`, `src/app/api/projects/[id]/artifacts/route.ts`, `src/app/api/artifacts/[id]/route.ts`, `src/app/api/artifacts/[id]/approve/route.ts` -- BARU: endpoint wizard.
- `src/lib/ai/prd-prompt.ts` -- BARU: system prompt drafter PRD (wajib bagian `## Cakupan Fitur dari Brief` + pertanyaan kritis) + `parsePrdResponse(text)` yang harden (strip fence, validasi field).

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- tipe `Artifact` + union `ArtifactStage`/`ArtifactType`/`ArtifactStatus` -- kontrak tipe lintas lapisan.
- [x] `src/lib/db/index.ts` -- fungsi `upsertBriefArtifact`, `upsertPrdArtifact`, `getArtifactsByProject`, `getArtifactById`, `updateArtifactContent`, `approveArtifact` (set `updated_at` eksplisit di semua path tulis; approve-ulang tidak menyentuh `updated_at`) -- lapisan data.
- [x] `src/lib/ai/prd-prompt.ts` -- system prompt PRD-drafter (bagian `## Cakupan Fitur dari Brief` wajib + pertanyaan kritis) + `parsePrdResponse(text)` strip-fence & validasi field -- logika prompt terpusat.
- [x] `src/app/api/projects/[id]/draft-prd/route.ts` + `.../artifacts/route.ts` + `src/app/api/artifacts/[id]/route.ts` + `.../approve/route.ts` -- endpoint wizard sesuai I/O Matrix.
- [x] `src/app/dashboard/page.tsx` -- judul kartu proyek jadi Link ke detail (tombol edit inline dipertahankan agar AC story 1 tetap terpenuhi) -- navigasi masuk wizard.
- [x] `src/app/dashboard/[projectId]/page.tsx` -- wizard Planning: form brief, tombol draf AI, editor konten PRD, blok Pertanyaan Kritis menonjol, tombol Simpan Draft / Setujui / Draf Ulang (disabled saat generate), daftar artefak proyek (brief + PRD) dengan statusnya.

**Acceptance Criteria:**
- Given proyek ada, when membuka `/dashboard/[projectId]`, then wizard Planning tampil: form brief, artefak existing (brief/PRD) dengan statusnya, dan blok pertanyaan kritis bila ada.
- Given brief yang menyebut beberapa fitur, when tombol draf AI ditekan, then brief tersimpan sebagai artifact `brief`, artifact PRD draft tersimpan, dan bagian `## Cakupan Fitur dari Brief` di konten PRD **dapat dicocokkan reviewer secara visual dengan daftar fitur di brief** (penilaian kualitas tetap manusia — bukan test AI-in-the-loop).
- Given draft PRD ada, when user mengedit konten lalu menyetujui, then status artifact jadi `approved` dan chip tahap Planning di **halaman daftar berubah `selesai` saat kembali/refresh halaman daftar**.
- Given AI gagal/JSON tidak valid, when draf diminta, then user melihat pesan error jelas, brief tetap tersimpan, dan TIDAK ada artifact PRD tersimpan.
- Given PRD sudah `approved`, when user minta draf ulang, then 409 dan tidak ada yang berubah.
- Given WhatsApp mode dipakai normal, then perilaku tidak berubah.

## Implementation Notes

- Semua task selesai; verifikasi smoke-test dengan AI asli: brief 3 fitur → PRD draft memuat `## Cakupan Fitur dari Brief` (semua fitur cocok) + blok pertanyaan kritis; approve → planning `selesai` di peta status; regenerate setelah approve → 409; approve-ulang `updated_at` tidak berubah; 400 untuk brief kosong/whitespace & PATCH whitespace; filter GET tak dikenal diabaikan.
- Keputusan implementasi: penulisan judul kartu dihalaman daftar jadi Link ke detail, tetapi tombol edit inline dipertahankan — menggantinya akan mematahkan AC story 1 (edit dari daftar) yang dijaga test e2e.
- Keputusan implementasi: blok pertanyaan kritis diekstrak dari konten PRD via regex `## Pertanyaan Kritis Belum Terjawab` di UI — konten tetap satu kolom `content` sesuai kontrak skema.
- Keputusan implementasi: pesan 502 AI-failure mendeteksi kata kunci config (API key/quota/model) agar menunjuk penyebab, sesuai mitigasi pre-mortem A1.
- Pasca-review 3 lens (25 test total): R1 upsert PRD atomik (`AND status != 'approved'`, null → 409 — tutup TOCTOU); R2 PATCH approved → 409; R4 approve brief → 409; R5 filter tervalidasi union (`ALL_ARTIFACT_STAGES/TYPES`); R6 parser menolak `open_questions` non-string; R7 konstanta `QUESTIONS_HEADING/EMPTY` dipakai prompt + UI; R8 regex error disempitkan; R9 error state load project/artifacts; R10 jalur `skipAi` simpan-brief-saja; R12 urutan cek PATCH 404→409→400.
- Verification kini benar-benar mengcover endpoint wizard: 8 test baru di `tests/api/artifacts.spec.ts` (409 guard, skipAi, approve-ulang, PATCH approved/draft, filter, brief kosong).

## Spec Change Log

## Review Triage Log

Review loop 0 — sumber: verification-gap (4, pre-verified) + edge-case-hunter (6) + adversarial/blind (10, 3 tumpuk) = 17 temuan unik. Rekomendasi konsolidasi R1–R13 (review-story3-analysis-recommendations.md) dipakai sebagai keputusan human. Hasil triase:

- VG-1..VG-4 — nol test untuk endpoint wizard (suite hijau = sinyal palsu) — **medium → patch (applied)**: 8 test baru `tests/api/artifacts.spec.ts` mengcover 409 guard, skipAi, approve-ulang updated_at, PATCH approved/draft, filter tak dikenal, brief kosong; VG-4 tertutup (verification path kini meng-observasi endpoint baru).
- EC-2 / AD-10 — TOCTOU approve vs upsert PRD (zombie varian 1) — **high → patch (applied, R1)**: UPDATE kondisional `AND status != 'approved'`, rowsAffected 0 → 409; gerbang 409 kini atomik di SQL.
- EC-3 — PATCH tanpa guard status (zombie varian 2) — **high → patch (applied, R2)**: PATCH pada artifact approved → 409.
- EC-4 — approve menerima type=brief — **medium → patch (applied, R4)**: route menolak brief (409); Design Notes diperbarui.
- EC-1 / AD-1 — filter `?stage=` bogus lolos cast ke WHERE — **medium → patch (applied, R5)**: validasi terhadap `ALL_ARTIFACT_STAGES/TYPES` (sumber kebenaran di types).
- EC-5 — `open_questions` non-string disaring diam-diam — **medium → patch (applied, R6)**: parser menolak (502) sesuai spec.
- EC-6 / AD-9 — fetch project gagal non-404 tak ditangani — **medium → patch (applied, R9)**: setError pada loadProject & loadArtifacts.
- AD-3 — editan brief hilang setelah PRD approved — **medium → patch (applied, R10)**: jalur `skipAi` simpan-brief-saja + tombol UI.
- AD-4 — magic string heading/placeholder duplikat dua file — **medium → patch (applied, R7)**: konstanta `QUESTIONS_HEADING/QUESTIONS_EMPTY` di prd-prompt.ts, dipakai prompt, composer, dan extractQuestions UI.
- AD-5 — regex error generik `/API/i` menyesatkan — **low → patch (applied, R8)**: kata kunci disempitkan (API key/AI_MODEL/quota/resource_exhausted/429).
- AD-6 — urutan cek PATCH 400 sebelum 404 — **low → patch (applied, R12)**: 404 → 409 → 400.
- AD-2 — fallback chain turun ke model lite tanpa jejak — **low → defer (sad-risk)**: perbaikan menyentuh provider (never-constraint); dicatat di Design Notes.
- AD-7 — parameter id upsert diabaikan pada jalur update — **low → defer (R11)**: API cleanup kosmetik; tidak memengaruhi perilaku.
- Klaim verified (tanpa temuan): persist-brief-dulu ✔, disiplin updated_at eksplisit ✔, strip fence parser ✔, tombol disabled saat generating ✔.

Semua patch diverifikasi: `tsc` bersih, **25/25 test Playwright lulus** (8 baru mengcover temuan VG/EC/AD di atas).

## Design Notes

- Keputusan routing: detail proyek di `/dashboard/[projectId]` (bukan modal) — wizard tahap berikutnya (Design, Development, dst.) akan menumpang halaman ini.
- Keputusan siklus draf: regenerate/simpan menimpa konten PRD yang belum approved; riwayat versi bukan scope story ini (changelog = story 5). Sad-risk single-user, diterima.
- Keputusan 409 regenerate-setelah-approve: menutup efek domino status zombie ("approved tapi konten draft?") — satu gerbang, seluruh rantai aman.
- Keputusan derivasi status planning: hanya approve artifact type=`prd` yang membuat `selesai`; brief sengaja selalu `draft` dan tidak pernah approved (A5, terdokumentasi).
- Keputusan filter GET tak dikenal: diabaikan (kembalikan semua) — sederhana, konsisten personal-tool.
- Bentuk respons AI: `{ "prd_markdown": string, "open_questions": string[] }` — parser menggabungkan keduanya menjadi satu konten markdown + blok pertanyaan.
- Keputusan R4: brief tidak bisa di-approve (409 di route) — derivasi status planning tetap murni dari approve PRD.
- Keputusan R10: editan brief tetap bisa disimpan setelah PRD approved via jalur `skipAi` — tanpa endpoint baru, tanpa menyentuh PRD.
- Sad-risk AD-2: fallback chain provider bisa turun ke model lite saat rate-limit tanpa jejak — dibiarkan (never-constraint "jangan ubah provider"); klaim "tier berat" berlaku untuk pemilihan model awal.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: bersih.
- `npx playwright test` -- expected: **25 lulus** (17 story 1-2 + 8 test wizard baru di `tests/api/artifacts.spec.ts`).

**Manual checks:**
- `/dashboard/[projectId]`: isi brief nyata → brief tersimpan → draf AI muncul (periksa `## Cakupan Fitur dari Brief` cocok dengan brief + blok pertanyaan kritis menonjol) → edit → setujui → chip Planning di halaman daftar `selesai` setelah kembali/refresh.
- Error path: brief kosong → 400; brief > 8.000 char → 400; (opsional) matikan API key / salah-set `AI_MODEL` → 502 dengan pesan menunjuk konfigurasi, brief tetap ada, tanpa artifact PRD.
- Regenerate saat PRD approved → 409 tampil jelas di UI.
