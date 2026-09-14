---
title: 'Paket Handoff ke Coding Agent'
type: 'feature'
created: '2026-09-14'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: 'd8c4327'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Setelah spec dan stories disetujui (story 4) dan masuk ke papan pengerjaan (story 5), eksekusi kode dilakukan di coding agent eksternal (Claude Code, Cursor, Windsurf, pi, dll.). Tanpa generator handoff terpadu, user harus menyalin manual spec arsitektur dan acceptance criteria secara terpisah, rawan tercecer atau format rusak (CAP-6).

**Approach:** Menyediakan generator **Paket Handoff** dari sebuah story yang telah disetujui: menyatukan konteks proyek, spec teknis arsitektur, dan kriteria selesai story ke dalam satu dokumen Markdown utuh yang siap disalin (*copy to clipboard*) dengan satu klik langsung dari kartu story di dashboard.

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Endpoint `GET /api/stories/[id]/handoff`: mengembalikan `{ handoff: string, story: Story }`.
- Route Handler Next.js 15 menggunakan pola asinkron: `type RouteContext = { params: Promise<{ id: string }> }` dan `const { id } = await ctx.params;`.
- **Prasyarat status story:** Hanya story non-draft (`approved` | `doing` | `done`) yang bisa digenerate handoff-nya. Story berstatus `draft` ditolak dengan **HTTP 409 Conflict** (`{ error: "Story draft harus disetujui terlebih dahulu sebelum membuat paket handoff." }`).
- Format output handoff adalah teks **Markdown utuh** yang mencakup 5 seksi baku:
  1. `# Paket Handoff Pengerjaan — [Project Name]` dengan metadata peran dan intro.
  2. `## 1. Identitas & Konteks Story` (Judul story, urutan, status, serta deskripsi & acceptance criteria).
  3. `## 2. Konteks Proyek & Ringkasan` (Nama & deskripsi proyek).
  4. `## 3. Spesifikasi Arsitektur & Teknis Proyek` (Konten artifact type `spec` tahap `planning`, atau teks fallback informatif jika belum ada).
  5. `## 4. Panduan Eksekusi untuk Coding Agent` (Peran Senior Software Engineer, instruksi no-regression, perintah verifikasi, dan instruksi ringkasan perubahan untuk Changelog Meja Kendali).
- UI Dashboard menyediakan tombol aksi handoff pada:
  - Kartu story di **Story Board** (kolom *Siap Dikerjakan*, *Sedang Dikerjakan*, dan *Selesai*).
  - Kartu story di **Langkah 3 Planning** untuk story yang sudah berstatus `approved`.
- Modal Preview Handoff di Dashboard menyediakan:
  - Header dengan judul story dan status.
  - Preview teks handoff preformatted yang dapat di-scroll (`max-h-[60vh] overflow-y-auto`).
  - Tombol **"Salin ke Clipboard"** dengan umpan balik visual ("Tersalin! ✅" yang reset kembali setelah 2 detik).
  - Fallback aman: jika `navigator.clipboard` ditolak/gagal, sediakan `<textarea readOnly>` yang siap disalin manual (`Ctrl+A` + `Ctrl+C`).
  - Tombol tutup dialog (dukungan klik backdrop dan tombol ESC).
- Generator bersifat deterministik dan murni perakitan teks dari data DB (tanpa panggilan AI).

**Never:**
- Jangan memanggil AI untuk menghasilkan paket handoff (murni komposisi template deterministik dari data DB).
- Jangan mengubah status story di database saat generate handoff (operasi `GET` murni *read-only*).
- Jangan membuat skema tabel atau kolom baru di database (memakai tabel `projects`, `artifact`, dan `story` existing).
- Jangan membungkus deskripsi story ke dalam nested triple-backtick tambahan yang merusak format markdown asli story.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Generate handoff story approved | GET `/api/stories/[id]/handoff`, story `approved` | 200 `{ handoff: string, story }` teks markdown lengkap 5 seksi | story ID tidak ditemukan → 404 |
| Generate handoff story doing/done | GET `/api/stories/[id]/handoff`, story `doing`/`done` | 200 `{ handoff: string, story }` | story ID tidak ditemukan → 404 |
| Generate handoff story draft | GET `/api/stories/[id]/handoff`, story `draft` | 409 `{ error: "Story draft harus disetujui terlebih dahulu..." }` | story belum approved → 409 |
| Proyek tidak memiliki spec artifact | GET `/api/stories/[id]/handoff`, spec belum dibuat / kosong | 200 `{ handoff, story }` dengan bagian spec memuat catatan fallback informatif | tetap kembalikan 200 dengan catatan fallback |
| Project ID tidak valid / terhapus | GET `/api/stories/[id]/handoff`, project_id yatim di DB | 404 `{ error: "Proyek tidak ditemukan." }` | return 404 |
| Salin dari UI Dashboard (sukses) | Klik tombol "Salin Handoff" pada kartu story | Clipboard terisi teks Markdown utuh, teks tombol berubah "Tersalin! ✅" selama 2 detik | — |
| Salin dari UI Dashboard (clipboard API gagal/diblokir) | Klik tombol salin saat clipboard API diblokir browser | Menampilkan pesan fallback instruksi dan memfokuskan textarea teks agar user bisa `Ctrl+C` manual | notifikasi ramah pengguna |

## Code Map

- `src/lib/handoff/generator.ts` -- fungsi murni deterministik `generateHandoffPackage(project: Project, story: Story, specContent?: string): string`. Merakit 5 seksi Markdown terstruktur siap konsumsi coding agent.
- `src/app/api/stories/[id]/handoff/route.ts` -- Route Handler GET:
  1. `await ctx.params` untuk mendapatkan `id`.
  2. `getStoryById(id)` → jika null return 404.
  3. Guard status: jika `story.status === 'draft'` return 409.
  4. `getProjectById(story.project_id)` → jika null return 404.
  5. `getArtifactRowByProjectStageType(story.project_id, 'planning', 'spec')`.
  6. Panggil `generateHandoffPackage(project, story, specArtifact?.content)`.
  7. Return 200 `{ handoff, story }`.
- `src/app/dashboard/[projectId]/page.tsx` -- Integrasi UI:
  - Tombol icon handoff di setiap kartu story (Board & Langkah 3 approved).
  - State modal preview handoff: `handoffStory: Story | null`, `handoffText: string`, `handoffCopied: boolean`, `handoffLoading: boolean`.
  - Komponen dialog modal responsif dengan tombol copy, scroll container, dan tombol tutup.
- `tests/api/handoff.spec.ts` -- Test suite otomatis Playwright:
  - 200 OK untuk story approved lengkap dengan spec.
  - 200 OK untuk story doing & done.
  - 200 OK saat spec belum dibuat (verifikasi kemunculan catatan fallback).
  - 409 Conflict saat generate handoff dari story berstatus `draft`.
  - 404 Not Found untuk story ID yang tidak ada.
  - Verifikasi struktur teks handoff (memuat judul proyek, judul story, acceptance criteria, dan instruksi changelog).

## Tasks & Acceptance

**Execution:**
- [x] `src/lib/handoff/generator.ts` -- Implementasi fungsi murni pembuat dokumen markdown handoff dengan 5 seksi terstruktur.
- [x] `src/app/api/stories/[id]/handoff/route.ts` -- Implementasi endpoint GET dengan penanganan Next.js 15 async params, guard 404 story, guard 409 draft, fetch project & spec, return `{ handoff, story }`.
- [x] `src/app/dashboard/[projectId]/page.tsx` -- Tambahkan tombol handoff pada kartu story (board & Langkah 3 approved), handler fetch handoff, modal preview dialog dengan tombol salin, timer reset "Tersalin! ✅", dan textarea fallback.
- [x] `tests/api/handoff.spec.ts` -- Buat automated tests komprehensif menguji skenario 200, 409, 404, fallback spec, dan struktur markdown.

**Acceptance Criteria:**
- Given story berstatus `approved`, `doing`, atau `done`, when client memanggil `GET /api/stories/[id]/handoff`, then sistem mengembalikan HTTP 200 `{ handoff: string, story: Story }` dengan teks Markdown utuh yang memuat detail story, spec teknis proyek, dan panduan eksekusi coding agent.
- Given story berstatus `draft`, when client memanggil `GET /api/stories/[id]/handoff`, then sistem mengembalikan HTTP 409 dengan pesan bahwa story draft harus disetujui terlebih dahulu.
- Given story yang tidak ada di database, when endpoint handoff dipanggil, then sistem mengembalikan HTTP 404 `{ error: "Story tidak ditemukan." }`.
- Given proyek yang belum memiliki artifact `spec`, when handoff diminta untuk story approved, then respons tetap HTTP 200 dengan seksi spec memuat teks fallback informatif.
- Given user menekan tombol "Handoff" pada kartu story di dashboard, then modal preview terbuka menampilkan teks handoff yang dapat disalin; ketika tombol "Salin ke Clipboard" diklik, teks tersalin dan umpan balik "Tersalin! ✅" tampil selama 2 detik.
- Given seluruh fitur Story 1–5 (proyek, status tahapan, brief, PRD, spec & stories, story board, changelog), then tidak ada regresi dan seluruh test suite lulus (`npx playwright test` dan `npx tsc --noEmit` bersih).

## Implementation Notes & Design Decisions

1. **Struktur Standar Markdown Handoff:**
   Template yang dihasilkan oleh `generateHandoffPackage` distandardisasi agar coding agent langsung memiliki konteks penuh:
   - Header & Peran Senior Developer
   - Identitas Story (Judul, Urutan, Status, Deskripsi & Kriteria Selesai)
   - Konteks Proyek (Nama & Deskripsi)
   - Spesifikasi Arsitektur / Teknis Proyek (dari artefak `spec` tahap `planning`)
   - Panduan Eksekusi (Aturan *no regression*, perintah verifikasi pengujian, dan instruksi ringkasan perubahan untuk Changelog Meja Kendali)
2. **Karakter Read-Only:**
   Endpoint `GET /api/stories/[id]/handoff` bersifat murni *read-only*. Pembuatan paket handoff tidak secara implisit mengubah status story menjadi `doing`. Transisi status story ke `doing` tetap merupakan aksi sadar pengguna via tombol "Mulai" pada Story Board.
3. **Penanganan Clipboard API Fallback:**
   Karena `navigator.clipboard.writeText` dapat diblokir oleh izin browser atau lingkungan non-HTTPS, UI modal menyertakan `<textarea readOnly>` yang siap disalin manual oleh user jika API clipboard menolak.
4. **Closing the Loop (Changelog):**
   Salah satu instruksi di template handoff mewajibkan coding agent untuk menghasilkan ringkasan 1-3 kalimat setelah selesai, mempermudah pengguna untuk mencatat hasil pengerjaan kembali ke fitur Changelog Meja Kendali (Story 5).

## Spec Change Log

- **2026-09-14 (Iterasi 1 - Advanced Elicitation):**
  - Mengubah status draf menjadi `approved` (siap implementasi).
  - Standardisasi format template Markdown 5 seksi pada `generateHandoffPackage`.
  - Penegasan pola async params Next.js 15: `const { id } = await ctx.params;`.
  - Penambahan skenario edge-case: fallback spec kosong/belum ada, invalid project ID, dan kegagalan clipboard API.
  - Perluasan sebaran UI: tombol handoff tersedia di kartu Kanban (approved/doing/done) dan kartu Langkah 3 yang approved.
  - Perluasan rincian test suite di `tests/api/handoff.spec.ts`.

## Review Triage Log

- **Iterasi 1 (BMad Advanced Elicitation - 5 Metode):**
  - [x] *Pre-mortem 1:* Risiko coding agent bekerja tanpa batasan → Ditambahkan seksi wajib Panduan Eksekusi dengan aturan no-regression dan instruksi verifikasi.
  - [x] *Pre-mortem 2:* Risiko kegagalan clipboard browser tanpa feedback → Ditambahkan umpan balik visual "Tersalin! ✅" dan fallback `<textarea readOnly>`.
  - [x] *Pre-mortem 3:* Loop Meja Kendali terputus setelah agent selesai → Ditambahkan instruksi output ringkasan changelog di akhir prompt handoff.
  - [x] *Edge-Case 1:* Proyek belum memiliki spec atau spec masih draft → Tetap HTTP 200 dengan catatan fallback informatif.
  - [x] *Edge-Case 2:* Validasi story ID tidak ada (404) dan project ID tidak valid (404).
  - [x] *Edge-Case 3:* Guard story draft (409 Conflict).
  - [x] *First Principles:* Pisahkan generator template menjadi fungsi murni di `src/lib/handoff/generator.ts` untuk kemudahan unit testing.
  - [x] *Critique & Refine:* Selaraskan penempatan tombol aksi handoff di Story Board & Langkah 3 approved.
  - [x] *Assumption Audit:* Konfirmasi bahwa operasi handoff murni read-only dan tidak mengubah status story ke `doing`.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: bersih tanpa error tipe.
- `npx playwright test tests/api/handoff.spec.ts` -- expected: seluruh pengujian endpoint handoff lulus.
- `npx playwright test` -- expected: semua suite lulus tanpa regresi.

**Manual checks:**
- Buka dashboard proyek yang memiliki story approved → klik icon/tombol "Handoff" pada kartu story board → modal preview terbuka dengan teks Markdown 5 seksi rapi.
- Klik "Salin ke Clipboard" → notifikasi/label berubah menjadi "Tersalin! ✅" → paste ke editor eksternal dan pastikan teks utuh dan valid.
- Cek story berstatus draft di Langkah 3 → pastikan tidak ada tombol handoff atau bila endpoint ditembak langsung mengembalikan 409 Conflict.
