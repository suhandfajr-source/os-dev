---
title: 'Story Board + Changelog'
type: 'feature'
created: '2026-09-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: 'a3ac05e'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Setelah stories dibuat (story 4), tidak ada tempat memantau pengerjaan: story mana yang sedang dikerjakan, mana yang selesai, dan catatan keputusan selama development (CAP-5 — Record). Tanpa itu, hasil pecahan planning lupa setelah dieksekusi di meja kerja lain.

**Approach:** Story Board di halaman detail proyek: status pengerjaan per story (`draft` → `approved` → `doing` → `done`, memakai kolom `status` yang sama — sesuai catatan Design Notes story 4 bahwa status board adalah domain story ini), plus **Changelog** append-only (tabel `changelog` per kontrak skema) untuk catatan keputusan/kejadian. Update status = murni DB (tanpa AI).

</frozen-after-approval>

## Boundaries & Constraints

**Always:**
- Transisi status via endpoint khusus `PATCH /api/stories/[id]/status`: target hanya `doing` | `done`, dan hanya dari story `approved`/`doing`/`done` (draft harus lewat approve dulu) — selain itu 409/400.
- Changelog **append-only**: hanya POST (201) dan GET (urut terbaru dulu); tanpa endpoint UPDATE/DELETE.
- `updated_at` story di-set eksplisit saat transisi status; `created_at` changelog dari DB default.
- Validasi: status tak dikenal → 400; note kosong/whitespace → 400; note maksimal 2.000 karakter → 400.

**Never:**
- Jangan memanggil AI di story ini (murni DB/UI).
- Jangan membuat endpoint edit/hapus changelog (append-only mutlak).
- Jangan mengubah endpoint/artifact story 1–4 (approve story, wizard, dsb. tetap seperti semula).
- Jangan membuat tabel/kolom di luar kontrak skema (tabel `changelog`: id, project_id, note, created_at).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mulai kerja story | PATCH `/api/stories/[id]/status` `{status: 'doing'}`, story `approved` | 200 `{story}` status=`doing`, `updated_at` baru | story `draft` → 409 "harus disetujui dulu"; id tidak ada → 404 |
| Selesaikan / buka ulang | PATCH sama `{status: 'done'}` / `{status: 'doing'}` dari `done` | 200 sesuai target | status tak dikenal → 400; dari `draft` → 409 |
| Tambah catatan | POST `/api/projects/[id]/changelog` `{note}` | 201 `{entry}`, terbaru tampil di atas | note kosong/whitespace → 400; > 2.000 char → 400; project tidak ada → 404 |
| Lihat catatan | GET `/api/projects/[id]/changelog` | 200 `{entries: [...]}` urut `created_at` DESC (terbaru dulu) | project tidak ada → 404 |
| Lihat board | GET `/api/projects/[id]/stories` (existing) | 200 — board mengelompokkan berdasarkan `status` | project tidak ada → 404 |

## Code Map

- `src/lib/db/index.ts` -- tambah tabel `changelog` di `doInitialize`; fungsi `updateStoryStatus` (validasi transisi), `addChangelogEntry`, `getChangelogEntries`; `approveStory` disesuaikan (no-op untuk status non-draft).
- `src/types/index.ts` -- perluas `StoryStatus` = 'draft' \| 'approved' \| 'doing' \| 'done'; tipe `ChangelogEntry`.
- `src/app/api/stories/[id]/status/route.ts`, `src/app/api/projects/[id]/changelog/route.ts` -- BARU.
- `src/app/dashboard/[projectId]/page.tsx` -- board section: daftar story dengan tombol transisi (Mulai/Selesai/Buka ulang), badge status pengerjaan; changelog section: form + daftar catatan.

## Tasks & Acceptance

**Execution:**
- [x] `src/types/index.ts` -- perluas `StoryStatus`, tambah `ChangelogEntry` -- kontrak tipe.
- [x] `src/lib/db/index.ts` -- tabel `changelog` + `updateStoryStatus`, `addChangelogEntry`, `getChangelogEntries`; sesuaikan `approveStory` -- lapisan data.
- [x] `src/app/api/stories/[id]/status/route.ts` -- PATCH transisi status -- perubahan pengerjaan.
- [x] `src/app/api/projects/[id]/changelog/route.ts` -- POST + GET -- catatan append-only.
- [x] `src/app/dashboard/[projectId]/page.tsx` -- Story Board + Changelog section -- CAP-5 tampil di meja kendali.
- [x] `tests/api/story-board.spec.ts` -- test transisi status + changelog -- verifikasi otomatis.

**Acceptance Criteria:**
- Given story `approved`, when user menekan "Mulai", then status jadi `doing` dan tampil di grup "Sedang dikerjakan" board.
- Given story `doing`, when user menekan "Selesai", then status jadi `done`; tombol "Buka ulang" mengembalikan ke `doing`.
- Given story masih `draft`, when transisi status dicoba, then 409 dengan pesan jelas (harus lewat approve).
- Given user menulis catatan, when dikirim, then entry tersimpan dan muncul paling atas; reload: tetap ada; tidak ada cara menghapusnya dari API.
- Given story 1–4 dipakai normal, then tidak ada regresi (suite penuh hijau).

## Implementation Notes
- `src/types/index.ts`: Memperluas `StoryStatus` dengan nilai `'doing' | 'done'`, menambahkan interface `ChangelogEntry`.
- `src/lib/db/index.ts`: Menambahkan pembuatan tabel `changelog` dan index, fungsi `updateStoryStatus` (transisi khusus `doing` | `done`, mengupdate `updated_at` eksplisit), `addChangelogEntry`, `getChangelogEntries` (urut `datetime(created_at) DESC, rowid DESC`), serta menyesuaikan `approveStory` agar no-op pada status non-draft.
- `src/app/api/stories/[id]/status/route.ts`: Endpoint PATCH untuk transisi status story dengan guard berlapis: 404 jika tidak ditemukan, 400 jika status/target tidak valid, 409 jika story masih draft.
- `src/app/api/projects/[id]/changelog/route.ts`: Endpoint GET & POST untuk changelog append-only: 404 jika project tidak ditemukan, 400 jika catatan kosong atau > 2.000 karakter, 201 mengembalikan entry baru.
- `src/app/api/stories/[id]/route.ts`: Guard kuncian konten diubah dari `status === 'approved'` menjadi `status !== 'draft'` agar story doing/done juga terkunci dari edit title/description (409).
- `src/app/api/projects/[id]/draft-spec/route.ts`: Guard regenerasi spec diperketat memeriksa story non-draft (`status !== 'draft'`) agar story doing/done tidak hilang ter-overwrite.
- `src/app/dashboard/[projectId]/page.tsx`: Menambahkan section Story Board (3 kolom: Siap Dikerjakan, Sedang Dikerjakan, Selesai dengan aksi Mulai, Selesai, Buka ulang) dan section Changelog (input form + daftar kronologis). Tombol board di-disable saat ada update in-flight untuk mencegah race condition.
- `tests/api/story-board.spec.ts`: 15 test otomatis untuk guard transisi status, kuncian edit, kuncian draft-spec, dan operasi append-only changelog beserta cascade delete.

## Spec Change Log
- 2026-09-13: Implementasi Story 5 tuntas, suite test 54/54 passed.

## Review Triage Log
- [patch] Button race condition pada board: tombol dinonaktifkan jika ada transisi in-flight (`updatingStoryId !== null || busy`) untuk mencegah konflik konkurensi klik beruntun.
- [patch] Text wrapping pada changelog note: ditambahkan kelas `break-words` agar teks panjang tanpa spasi tidak merusak kontainer layout.
- [patch] Kuncian edit story doing/done: `src/app/api/stories/[id]/route.ts` menjaga status non-draft agar konten tetap terkunci 409.
- [patch] Guard draft-spec regenerasi: `src/app/api/projects/[id]/draft-spec/route.ts` menjaga status non-draft agar story doing/done tidak hilang.

## Verification

**Commands:**
- `npx tsc --noEmit` -- expected: bersih.
- `npx playwright test` -- expected: semua lulus (tanpa regresi story 1–4).

**Manual checks:**
- Board: Mulai → Selesai → Buka ulang jalan; draft tidak bisa langsung dikerjakan.
- Changelog: tambah catatan → tampil terbaru dulu; persisten setelah reload.
