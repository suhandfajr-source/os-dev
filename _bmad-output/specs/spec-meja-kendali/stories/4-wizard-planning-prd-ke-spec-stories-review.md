---
title: 'Review & Elicitation — Story 4 Wizard Planning (PRD ke Spec + Stories)'
target: 'stories/4-wizard-planning-prd-ke-spec-stories.md'
method: 'BMad Advanced Elicitation (5 metode)'
iteration: 1
date: '2026-09-13'
status: 'applied'
---

# Hasil Review & Advanced Elicitation — Story 4: Wizard Planning (PRD ke Spec + Stories)

> Review dilakukan terhadap `stories/4-wizard-planning-prd-ke-spec-stories.md` menggunakan 5 metode elicitation
> (pre-mortem, critique & refine, boundary & edge case sweep, assumption audit, stakeholder lens rotation).
> Seluruh temuan diverifikasi terhadap kode aktual (baseline commit `3413c4f`) sebelum direkomendasikan.
> **Semua rekomendasi sudah diterapkan ke file story** — laporan ini adalah rekamannya.

---

## Ringkasan Eksekutif

Dokumen story sudah **solid secara arsitektur**: Code Map terverifikasi akurat terhadap kode, guard 409
berlapis dirancang baik, dan keputusan desain terdokumentasi. Gap terbesar yang ditemukan:

1. **Bug validasi** — `stories: []` (array kosong) lolos validasi lama → spec tersimpan tanpa story,
   langsung meracuni story 5/6.
2. **Kebocoran acceptance criteria** — kualitas wajib di Intent ("kriteria selesai per story",
   "stories dari PRD") tidak diverifikasi oleh satu pun AC.
3. **Dua skenario kehilangan keputusan user** — regenerate menimpa editan draft tanpa konfirmasi, dan
   approve story mengunci regenerasi permanen tanpa peringatan.
4. **Jebakan teknis SQLite** — kolom `order` adalah reserved keyword, wajib dikutip `"order"`.

Total: **8 temuan** — 7 diterapkan ke file story, 1 diverifikasi akurat tanpa koreksi.

---

## Verifikasi Fakta (grounding)

Klaim dokumen dicek terhadap repositori sebelum review, agar temuan berbasis fakta:

| Klaim di dokumen | Hasil verifikasi |
|---|---|
| Baseline commit `3413c4f` | ✅ Cocok — `feat(dashboard): wizard Planning — brief ke draf PRD dengan AI (story 3)` |
| Pola `upsertPrdArtifact` di `src/lib/db/index.ts` | ✅ Ada (baris 708), ditiru untuk `upsertSpecArtifact` |
| `parsePrdResponse` + system prompt di `src/lib/ai/prd-prompt.ts` | ✅ Ada (baris 40), pola ditiru ke `spec-prompt.ts` |
| Pola guard 409 berlapis di `draft-prd/route.ts` | ✅ Ada — 404 → validasi body → skipAi → 409 approved → AI → parse |
| `client.batch` untuk atomikitas | ✅ Ada di `src/lib/db/index.ts` (baris 142) |
| Jalur `skipAi` existing tidak tersentuh | ✅ Ada di route & dashboard (`body: JSON.stringify({ brief, skipAi: true })`) |
| Endpoint generik approve `src/app/api/artifacts/[id]` | ✅ Ada |
| Kontrak tabel `story` di `architecture-diagrams.md` | ✅ Sesuai — id, project_id, title, description, status, order, timestamps |
| Wizard "Langkah 1/2" + state `generating` di dashboard | ✅ Ada — Langkah 3 adalah penambahan baru |

**Kesimpulan: Code Map akurat, tidak ada koreksi yang diperlukan.**

---

## Temuan per Metode

### 1. Pre-mortem Analysis — "6 bulan ke depan, fitur ini meracuni story 5 & 6. Kenapa?"

| # | Temuan | Severity | Status |
|---|--------|----------|--------|
| 1.1 | Kualitas wajib di Intent — *"spec memuat kriteria selesai per story"* dan *"stories berasal dari PRD"* — tidak di-cover acceptance criteria mana pun. AC lama hanya mengecek "tersimpan & tampil". | **Tinggi** | ✅ Diterapkan: 2 AC baru (kriteria per story + traceability manual sebagai prasyarat approve) |
| 1.2 | Regenerate menimpa SEMUA story — termasuk editan draft user yang belum di-approve — tanpa konfirmasi. Guard hanya melindungi story *approved*. Editan berjam-jam bisa hilang sekali klik. | **Tinggi** | ✅ Diterapkan: keputusan UI — konfirmasi sebelum regenerate saat ada editan draft (lapisan UX; server tetap replace penuh) |
| 1.3 | User yang approve story saat spec masih draft mengunci regenerasi **permanen** tanpa peringatan — keputusan menyesal tanpa jalan keluar. | Sedang | ✅ Diterapkan: keputusan UI — peringatan konsekuensi sebelum approve story pertama |

### 2. Critique and Refine — kualitas dokumen

| # | Temuan | Severity | Status |
|---|--------|----------|--------|
| 2.1 | **Kekuatan:** frozen intent jelas, I/O matrix lengkap, Design Notes terdokumentasi, Code Map terverifikasi akurat. | — | ✅ Diverifikasi, tanpa koreksi |
| 2.2 | Task test tidak mencakup kasus validasi baru; tidak ada AC untuk PATCH field tak dikenal dan urutan GET yang deterministik. | Sedang | ✅ Diterapkan: task test diperluas + AC urutan deterministik |

### 3. Boundary & Edge Case Sweep

| # | Temuan | Severity | Status |
|---|--------|----------|--------|
| 3.1 | **Bug potensial:** `stories: []` lolos validasi lama — "tolak bukan array" tidak menangkap array kosong → spec tersimpan tanpa story, langsung meracuni story 5/6 yang mengonsumsi tabel `story`. | **Tinggi** | ✅ Diterapkan: harden "tolak array kosong" → 502 + baris matrix baru + AC + test case |
| 3.2 | PATCH tanpa batas panjang; field tak dikenal (misal injeksi `status`/`order`) tidak eksplisit diabaikan. | Sedang | ✅ Diterapkan: title ≤ 200, description ≤ 20.000 → 400; field tak dikenal diabaikan |
| 3.3 | Kolom `order` = **reserved keyword SQLite** — query tanpa kutipan akan gagal saat implementasi. | Sedang | ✅ Diterapkan: catatan teknis di Code Map (kutip `"order"`) + kebijakan renumber 0..N-1 + AC deterministik |

### 4. Assumption Audit — asumsi terlemah di-stress-test

| # | Asumsi | Confidence | Status |
|---|--------|-----------|--------|
| 4.1 | Satu panggilan AI cukup untuk spec penuh + semua story (PRD panjang → risiko truncation JSON) | Medium | ✅ Dicatat: mitigasi prompt (batas wajar jumlah story) + parse fail-closed → 502; solusi pecahan per-bagian jadi kandidat R2, bukan dibangun prematur |
| 4.2 | `client.batch` atomik & `responseMimeType` JSON didukung provider | Tinggi | ✅ Terverifikasi dari pola story 3 yang sudah jalan |
| 4.3 | Skema tabel `story` cukup untuk story 5 (board) & 6 (handoff) | Medium–Tinggi | ✅ Dieksplisitkan di Design Notes: tanpa kolom `stage` (semua story = backlog development R1); status board (todo/selesai) adalah domain story 5 |

### 5. Stakeholder Lens Rotation

| Stakeholder | Kebutuhan | Status |
|---|---|---|
| **User wizard (vibecoder)** | Perlindungan dari keputusan yang tak bisa dibatalkan (lock regenerasi, overwrite editan) | ✅ Tercover 2 lapisan UI baru (1.2, 1.3) |
| **Story 5 — story board** | Tabel `story` dengan `order` stabil & domain status jelas | ✅ Kebutuhan skema dieksplisitkan (4.3) + AC urutan deterministik |
| **Story 6 — handoff** | Spec yang memuat kriteria selesai per story | ✅ Tercover AC kriteria-per-story baru (1.1) |
| **Developer penerima handoff** | Code Map akurat & jebakan teknis terdokumentasi | ✅ Diverifikasi (2.1) + catatan `order` (3.3) |

---

## Perubahan yang Diterapkan ke File Story

| Bagian | Perubahan |
|---|---|
| **Frontmatter** | `review_loop_iteration: 0 → 1` |
| **Boundaries — Always** | Harden validasi (tolak `stories` kosong) + aturan PATCH (abaikan field tak dikenal, batas panjang) |
| **I/O Matrix** | +2 baris: AI kembalikan `stories` kosong → 502; PATCH batas panjang → 400 |
| **Code Map** | Catatan teknis: kutip `"order"` (reserved keyword) + renumber 0..N-1 deterministik |
| **Tasks & Acceptance** | Task test diperluas (3 kasus baru); +4 AC (stories kosong → 502, kriteria per story + traceability, urutan deterministik) |
| **Design Notes** | +3 keputusan (peringatan lock approve story pertama; konfirmasi regenerate; asumsi token limit & mitigasinya) + eksplisitasi skema untuk story 5/6 |
| **Verification — Manual checks** | +3 cek (kriteria per story & traceability; peringatan/konfirmasi UI; batas PATCH 200/201) |
| **Review Triage Log** | Iterasi 1 dicatat lengkap dengan status per temuan |

---

## Rekomendasi Lanjutan

1. **Langkah alami berikutnya:** jalankan `bmad-code-review` atau `bmad-walkthrough` terhadap file story yang sudah diperbarui, atau langsung eksekusi story ini via `bmad-build`.
2. **Saat implementasi, waspadai 3 hal dari laporan ini:** (a) kutip kolom `"order"` di semua query;
   (b) validasi array kosong di `parseSpecResponse`, bukan hanya di route; (c) dua lapisan UI
   (peringatan approve pertama + konfirmasi regenerate) adalah bagian dari AC, bukan opsional.
3. **Watchlist R2:** jika di lapangan AI sering gagal 502 karena truncation di PRD panjang, pecahan
   per-bagian (multi-call) adalah mitigasi yang sudah dicatat di Design Notes.
