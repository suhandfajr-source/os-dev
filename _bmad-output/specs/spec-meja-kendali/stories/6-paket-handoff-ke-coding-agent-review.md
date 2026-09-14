---
title: 'Review & Elicitation — Story 6 Paket Handoff ke Coding Agent'
target: 'stories/6-paket-handoff-ke-coding-agent.md'
method: 'BMad Advanced Elicitation (5 metode)'
iteration: 1
date: '2026-09-14'
status: 'applied'
---

# Hasil Review & Advanced Elicitation — Story 6: Paket Handoff ke Coding Agent

> Review dilakukan terhadap `stories/6-paket-handoff-ke-coding-agent.md` menggunakan 5 metode elicitation BMad:
> **Pre-mortem Analysis**, **Boundary & Edge Case Sweep**, **First Principles Analysis**, **Critique and Refine**, dan **Assumption Audit**.
> Seluruh temuan diverifikasi terhadap kode aktual (baseline commit `d8c4327`) dan arsitektur `spec-meja-kendali` sebelum direkomendasikan.
> **Semua rekomendasi telah disinkronkan ke file story** — dokumen ini adalah rekaman lengkap hasil telaah kritisnya.

---

## Ringkasan Eksekutif

Story 6 adalah **pintu keluar sekaligus checkpoint penentu (done checkpoint)** dari loop inti R1 Meja Kendali:
`brief → spec/stories disetujui → paket handoff ditempel ke coding agent → hasil dicatat kembali (changelog)`.
Secara konseptual, draf awal story sudah tajam dalam membatasi skop (tanpa panggilan AI, murni deterministik, tanpa mutasi status DB, dan tanpa tabel baru).

Namun, elicitation mengungkap beberapa celah kritis yang dapat menggagalkan eksekusi di dunia nyata:
1. **Ambigu Kontrak Markdown Template** — Draf awal hanya menyebut "format teks Markdown utuh", tanpa standardisasi seksi wajib yang dibutuhkan coding agent (Claude Code, Cursor, Windsurf, pi). Coding agent membutuhkan seksi peran (Senior Dev), panduan verifikasi perintah (`npm test`), batasan scope ("jangan regresi"), dan reminder pencatatan ke changelog Meja Kendali.
2. **Kerapuhan Clipboard di Lingkungan Nyata** — Pemanggilan langsung `navigator.clipboard.writeText` rawan gagal di lingkungan non-HTTPS, browser terkunci, atau mode sandbox. Dibutuhkan fallback textarea copyable transparan di dalam UI dialog preview.
3. **Penyelarasan UI Multi-Akses** — Di mana tombol handoff diletakkan? Hanya di papan Kanban atau juga di Langkah 3 (Planning)? Elicitation menetapkan: tombol handoff harus tersedia di kartu story Kanban (Siap Dikerjakan, Sedang Dikerjakan, Selesai) **dan** di daftar story Langkah 3 yang sudah berstatus `approved`.
4. **Pola Asinkron Route Handler Next.js 15** — Next.js 15 mewajibkan `const { id } = await ctx.params;`. Jika tidak ditegaskan, implementer rawan terkena runtime error params.
5. **Penanganan Kasus Spec Fallback** — Jika proyek belum memiliki artifact `spec` (atau masih draf), generator harus menyediakan teks fallback yang jelas dan sopan tanpa menggagalkan permintaan (HTTP 200).

Total: **9 temuan teridentifikasi dan seluruhnya telah diterapkan** ke dalam spesifikasi Story 6.

---

## Verifikasi Fakta (Grounding Repositori)

Pengecekan terhadap repositori pada baseline commit `d8c4327` menghasilkan konfirmasi berikut:

| Aspek yang Dicek | Lokasi Kode / Dokumen | Hasil Verifikasi |
|---|---|---|
| Baseline commit | `git log -n 1` (`d8c4327`) | ✅ Sesuai — `feat(dashboard): story board pengerjaan & changelog append-only (story 5)` |
| Done Checkpoint R1 | `stories.yaml` (baris 55–65) | ✅ Terkonfirmasi `done_checkpoint: true` untuk Story 6 |
| Skema tabel `story`, `projects`, `artifact` | `src/lib/db/index.ts` (baris 120–190) | ✅ Tidak perlu tabel/kolom baru; skema existing sudah memadai |
| Helper `getStoryById`, `getProjectById` | `src/lib/db/index.ts` | ✅ Sudah tersedia |
| Helper `getArtifactRowByProjectStageType` | `src/lib/db/index.ts` (baris 863) | ✅ Siap pakai untuk `('planning', 'spec')` |
| Konvensi Next.js 15 Route Context | `src/app/api/stories/[id]/approve/route.ts` | ✅ Pola `type RouteContext = { params: Promise<{ id: string }> }` konsisten |
| Guard status non-draft | `src/types/index.ts` | ✅ `StoryStatus = 'draft' \| 'approved' \| 'doing' \| 'done'` |
| Komponen UI Dashboard | `src/app/dashboard/[projectId]/page.tsx` | ✅ Tersedia kartu story di board (baris 800–900) & Langkah 3 (baris 680–760) |

---

## Temuan per Metode Elicitation

### 1. Pre-mortem Analysis (risk #59)
*Membayangkan skenario kegagalan di masa depan saat vibecoder memakai paket handoff ke coding agent, lalu menelusuri penyebab dan pencegahannya.*

- **Skenario 1: Coding agent mengeksekusi dengan asumsi liar lalu memecahkan kode yang sudah ada.**
  - *Sebab:* Prompt handoff hanya memuat deskripsi story tanpa batasan teknis (non-functional boundaries) dan perintah verifikasi.
  - *Pencegahan:* Standardisasi template handoff dengan seksi wajib **Panduan Eksekusi untuk Coding Agent**: peran Senior Software Engineer, instruksi "jangan merusak fitur Story 1–5", dan perintah verifikasi eksplisit (`npx tsc --noEmit` & test runner).
- **Skenario 2: User mengira sudah menyalin handoff, tapi yang tertempel di terminal agent adalah clipboard lama.**
  - *Sebab:* Browser menolak `navigator.clipboard.writeText` tanpa umpan balik kegagalan ke UI.
  - *Pencegahan:* UI modal preview menyediakan: (a) tombol salin dengan status visual berhasil ("Tersalin! ✅" reset 2 detik), dan (b) textarea baca-saja (*read-only*) sehingga jika clipboard API diblokir browser, user tetap bisa menekan `Ctrl+A` + `Ctrl+C` secara manual.
- **Skenario 3: Loop pengerjaan putus setelah coding agent selesai.**
  - *Sebab:* Coding agent tidak tahu bahwa hasilnya perlu dicatat ke Changelog Meja Kendali (Story 5).
  - *Pencegahan:* Di bagian akhir handoff template, cantumkan instruksi: *"Setelah implementasi dan tes lulus, berikan ringkasan perubahan 1-3 kalimat untuk dicatat pada Changelog proyek di Meja Kendali."*

### 2. Boundary & Edge Case Sweep (technical #71)
*Penyisiran nilai ekstrem, null, status tak terduga, dan batas sistem.*

- **Kasus 2.1: Proyek belum memiliki spec atau spec masih kosong.**
  - *Respons:* HTTP 200 tetap sukses. Bagian spec dalam markdown diisi teks fallback informatif: `> *Catatan: Spesifikasi arsitektur proyek belum dibuat atau masih kosong. Gunakan kriteria selesai story sebagai acuan utama.*`
- **Kasus 2.2: Story ID tidak ada di database.**
  - *Respons:* HTTP 404 `{ error: "Story tidak ditemukan." }`.
- **Kasus 2.3: Story masih berstatus `draft`.**
  - *Respons:* HTTP 409 Conflict `{ error: "Story draft harus disetujui terlebih dahulu sebelum membuat paket handoff." }`.
- **Kasus 2.4: Project ID yatim (*orphaned*) atau project terhapus.**
  - *Respons:* HTTP 404 `{ error: "Proyek tidak ditemukan." }`.
- **Kasus 2.5: Deskripsi story memuat format markdown bersarang (nested code fence ` ``` `).**
  - *Pencegahan:* Generator handoff tidak membungkus deskripsi story ke dalam code fence tambahan; deskripsi story disajikan langsung sebagai blok teks Markdown alami agar tidak merusak formatting.

### 3. First Principles Analysis (core #24)
*Mengupas esensi mendasar: Apa yang benar-benar dibutuhkan oleh coding agent eksternal agar dapat bekerja secara mandiri dan akurat?*

- **Kebenaran Dasar 1:** Coding agent bekerja paling optimal jika menerima format konteks hirarkis:
  1. *Identitas & Peran* (Siapa dia dan apa proyeknya).
  2. *Tugas Spesifik* (Judul story + Acceptance Criteria mendalam).
  3. *Batasan Sistem & Arsitektur* (Spec teknis, pola kode yang ditaati).
  4. *Kriteria Keberhasilan & Verifikasi* (Perintah pengecekan yang harus dijalankan).
  5. *Langkah Penutup* (Instruksi output changelog).
- **Kebenaran Dasar 2:** Handoff harus deterministik dan instan. Tidak boleh ada latensi pemanggilan LLM hanya untuk menyusun prompt teks dari data yang sudah ada di DB.

### 4. Critique and Refine (core #27)
*Penyempurnaan arsitektur kode dan kejelasan kontrak teknis.*

- **Refinement 4.1: Struktur modul mandiri di `src/lib/handoff/generator.ts`.**
  - Pisahkan fungsi murni perakit template (`generateHandoffPackage`) agar mudah diuji secara unit test tanpa mock database atau HTTP context.
- **Refinement 4.2: Tipe data parameter generator.**
  - `generateHandoffPackage(project: Project, story: Story, specContent?: string): string`.
- **Refinement 4.3: Perilaku modal preview di UI Dashboard.**
  - Modal harus memiliki:
    - Judul dialog jelas (`Paket Handoff — [Judul Story]`).
    - Area preview yang scrollable (`max-h-[60vh] overflow-y-auto`).
    - Tombol "Salin ke Clipboard" dengan icon dan feedback transisi.
    - Tombol "Tutup" (serta dukungan klik backdrop / tombol ESC).

### 5. Assumption Audit (risk #64)
*Pemeriksaan asumsi tersembunyi.*

- **Asumsi 5.1: Apakah generate handoff mengubah status story menjadi `doing`?**
  - *Audit:* **TIDAK.** Generate handoff adalah operasi murni *read-only* (GET). User mungkin menyalin handoff untuk dipelajari terlebih dahulu. Memulai pengerjaan (`doing`) tetap merupakan aksi eksplisit via tombol "Mulai" di Story Board (Story 5).
- **Asumsi 5.2: Apakah perlu menyertakan seluruh riwayat Changelog dalam handoff?**
  - *Audit:* Tidak perlu di R1. Menyertakan changelog panjang berisiko token bloat. Konteks arsitektur dari spec sudah mencukupi untuk pengerjaan per-story.

---

## Perubahan yang Diterapkan ke File Story

Berdasarkan temuan di atas, file `_bmad-output/specs/spec-meja-kendali/stories/6-paket-handoff-ke-coding-agent.md` diperbarui dengan:

1. **Frontmatter:**
   - `review_loop_iteration: 0 → 1`
   - `status: 'draft' → 'approved'`
2. **Boundaries & Constraints:**
   - Menambahkan spesifikasi template baku 5 bagian untuk `generateHandoffPackage`.
   - Menambahkan penegasan pola async params Next.js 15: `const { id } = await ctx.params;`.
   - Menambahkan spesifikasi interaksi modal UI dan fallback textarea jika clipboard API diblokir.
   - Menegaskan ketersediaan tombol handoff pada kartu Kanban (approved, doing, done) dan story approved di Langkah 3.
3. **I/O & Edge-Case Matrix:**
   - Menambahkan rincian skenario spec kosong/fallback, invalid ID, dan clipboard rejection.
4. **Code Map & Tasks:**
   - Merinci kontrak modul `src/lib/handoff/generator.ts`.
   - Merinci rute API `src/app/api/stories/[id]/handoff/route.ts`.
   - Merinci komponen & state modal pada `src/app/dashboard/[projectId]/page.tsx`.
   - Merinci 6 test case di `tests/api/handoff.spec.ts`.
5. **Design Notes & Review Triage Log:**
   - Menambahkan catatan keputusan desain hasil elicitation pada seksi Design Notes.
   - Mencatat log iterasi review 1 secara lengkap.

---

## Rekomendasi Lanjutan

1. **Langkah berikutnya:** Story 6 kini berstatus **approved** dan siap dieksekusi secara langsung menggunakan skill `bmad-build`.
2. **Prioritas implementasi:**
   - Langkah 1: Buat fungsi murni `src/lib/handoff/generator.ts`.
   - Langkah 2: Buat Route Handler `src/app/api/stories/[id]/handoff/route.ts` dan test suite `tests/api/handoff.spec.ts`.
   - Langkah 3: Integrasikan tombol handoff dan modal preview/copy di `src/app/dashboard/[projectId]/page.tsx`.
   - Langkah 4: Jalankan verifikasi menyeluruh (`npm run lint`, `npx tsc --noEmit`, dan `npx playwright test`).
