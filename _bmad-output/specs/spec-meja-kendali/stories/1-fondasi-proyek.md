---
title: 'Fondasi Proyek — entitas, API, dan daftar proyek'
type: 'feature'
created: '2026-09-13'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '79628ac8258e028bc9029f2a171b989916207dc4'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard mode Meja Kendali belum ada sama sekali — tidak ada tempat membuat dan melihat daftar proyek sebagai entitas utama asisten SDLC (CAP-2 dari SPEC Meja Kendali). Rilis R1 lain (mesin status, wizard) semuanya bergantung pada keberadaan entitas `project`.

**Approach:** Tambah tabel `projects` di SQLite mengikuti pola DB existing, fungsi CRUD di `src/lib/db/index.ts`, API REST di `/api/projects` mengikuti pola API existing, dan halaman `/dashboard` yang menampilkan daftar proyek dengan pola UI aplikasi (fokus backend; UI cukup fungsional).

## Boundaries & Constraints

**Always:**
- Ikuti pola existing: libsql client + `ensureDbInitialized` (CREATE TABLE IF NOT EXISTS) di `src/lib/db/index.ts`; API route Next.js app router dengan `NextResponse` dan pesan error bahasa Indonesia; typed interfaces di `src/types/index.ts`.
- UI Dashboard dibuat sebagai client component dengan `fetch`, konsisten dengan gaya komponen existing (Tailwind, pola state `useState`/`useEffect`).
- Setiap operasi tulis memperbarui `updated_at`.

**Never:**
- Jangan mengintroduksi ORM/library baru (constraint SPEC: stack existing).
- Jangan mengubah perilaku atau tampilan WhatsApp mode existing (`/`, `/chat`).
- Jangan membangun mesin status tahapan, wizard, atau artefak — itu story 2, 4, 5.
- Tanpa auth/role (personal tool single-user).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Buat proyek | POST `/api/projects` `{name, description?}` | 201 `{project}` lengkap dengan id, timestamps | `name` kosong/hanya spasi → 400 `{error}` |
| Daftar proyek | GET `/api/projects` | 200 `{projects: [...]}` urut `updated_at` DESC | DB gagal → 500 `{error}` |
| Detail proyek | GET `/api/projects/[id]` | 200 `{project}` | id tidak ada → 404 |
| Update proyek | PATCH `/api/projects/[id]` `{name?, description?}` | 200 `{project}` dengan `updated_at` baru | id tidak ada → 404; body tidak ada field valid → 400 |
| Hapus proyek | DELETE `/api/projects/[id]` | 200 `{ok: true}` | id tidak ada → 404 |

</frozen-after-approval>

## Code Map

- `src/lib/db/index.ts` -- lapisan data; tambah blok CREATE TABLE `projects` di `ensureDbInitialized` + fungsi CRUD; pola contoh: `createConversation`, `listConversations`, `deleteConversation`.
- `_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md` -- kontrak skema data inti R1; kolom `projects` WAJIB persis: `id, name, description, created_at, updated_at`; tabel `artifact`/`story`/`changelog` dibuat di story berikutnya, bukan di sini.
- `src/types/index.ts` -- kontrak tipe; tambah `interface Project` (pola: `Conversation` di baris 94).
- `src/app/api/conversations/route.ts` -- pola untuk `src/app/api/projects/route.ts` (GET list + POST create, `runtime = 'nodejs'`, id via `crypto.randomUUID()`).
- `src/app/api/conversations/[id]/route.ts` -- pola untuk `src/app/api/projects/[id]/route.ts` (GET/PATCH/DELETE + 404).
- `src/app/page.tsx`, `src/components/chat/*` -- WhatsApp mode existing; JANGAN diubah.
- `src/app/dashboard/page.tsx` -- BARU: halaman daftar proyek (form buat + kartu daftar + aksi edit/hapus).

## Tasks & Acceptance

**Execution:**
- [ ] `src/types/index.ts` -- tambah `interface Project { id, name, description, created_at, updated_at }` -- kontrak tipe dipakai DB & API.
- [ ] `src/lib/db/index.ts` -- tabel `projects` + fungsi `createProject`, `listProjects`, `getProjectById`, `updateProject`, `deleteProject` -- lapisan data mengikuti pola existing.
- [ ] `src/app/api/projects/route.ts` -- GET (list) + POST (create) -- API koleksi.
- [ ] `src/app/api/projects/[id]/route.ts` -- GET + PATCH + DELETE -- API item.
- [ ] `src/app/dashboard/page.tsx` -- halaman daftar proyek: form buat proyek, kartu daftar (nama + deskripsi + timestamps), aksi edit & hapus -- meja kendali tahap paling awal.

**Acceptance Criteria:**
- Given aplikasi jalan, when membuka `/dashboard`, then tampil daftar proyek (kosong di awal) beserta form membuat proyek.
- Given form diisi nama valid, when disubmit, then proyek baru muncul di daftar dan tetap ada setelah reload (persisten di `assistant.db`).
- Given proyek ada, when nama/deskripsi diubah lalu disimpan, then perubahan tampil dan `updated_at` memindahkan posisinya di urutan daftar.
- Given proyek ada, when dihapus, then hilang dari daftar dan GET berikutnya mengembalikan 404.
- Given WhatsApp mode dipakai normal (chat, kamus, simpan tools), then perilakunya tidak berubah sama sekali.

## Implementation Notes

## Spec Change Log



## Review Triage Log

Review loop 0 — sumber temuan: blind-hunter + edge-case-hunter + verification-gap (diff vs baseline `79628ac`).

- blind-1 / edge-1 — POST menerima `body.id` klien (route.ts:27) — **medium** — terverifikasi: `body.id || crypto.randomUUID()`; tabrakan PK → 500, dan Code Map menyatakan "id via `crypto.randomUUID()`". → **patch** (applied)
- blind-2 / adv-2 — client-controlled id, sama akar dengan di atas — **medium** — → **patch** (merged, applied)
- edge-2 — body JSON `null` lolos `.catch(() => ({}))` → TypeError → 500 pada POST (route.ts:22) — **medium** — terverifikasi: `.catch` tidak menangani hasil `null`. → **patch** (applied)
- edge-3 — masalah sama pada PATCH `[id]/route.ts:26` — **medium** — terverifikasi. → **patch** (applied)
- edge-4 — panjang name/description tak dibatasi — **medium** — real: string multi-MB tersimpan & dirender; fix tetap dalam kontrak 400 yang sudah ada. → **patch** (applied)
- edge-5 — timezone: DB simpan UTC, `new Date(ts)` parsing lokal → timestamp WITA bergeser +8 jam — **high** — terverifikasi di `formatTimestamp`. → **patch** (applied, tambah 'Z')
- edge-6 / adv-4 — tidak ada state pending/busy → double-submit membuat duplikat, tombol tampak mati — **medium** — terverifikasi. → **patch** (applied, state `busy`)
- edge-7 — hapus tanpa konfirmasi → kehilangan data permanen satu klik — **high** — terverifikasi. → **patch** (applied, `window.confirm`)
- edge-8 — GET gagal diabaikan → server error tampil sebagai empty state "Belum ada proyek" — **medium** — terverifikasi. → **patch** (applied)
- edge-9 — `mapProjectRow` null timestamp → "null" string — **false** — kolom punya DEFAULT CURRENT_TIMESTAMP dan semua path insert tidak menyertakan kolom ts; null tak terjangkau.
- edge-10 — lost update antar-tab (optimistic lock) — **low** — single-user, dua tab mengedit item sama jarang terjadi sehari-hari; fix menambah kolom versi + kontrak 409 = bukan koreksi langsung. → **reject**
- adv-1 — tidak ada auth di endpoint proyek — **medium** — real, tapi intent frozen menyatakan eksplisit "Never: Tanpa auth/role (personal tool single-user)". → **defer** (out of scope per intent)
- adv-3 — DELETE tanpa cascade — **false** — belum ada tabel yang mereferensi `projects` (artifact/story/changelog adalah story berikutnya); tidak ada data yang bisa yatim saat ini.
- adv-5 — error global hanya dirender di form buat; error update/delete muncul jauh dari aksi — **medium** — terverifikasi. → **patch** (applied, pindah blok error ke bawah header)
- adv-6 — tidak ada pagination — **low** — skala personal, jarang tercapai; fix menambah query param + UI. → **reject**
- adv-7 — `catch (err: any)` — **low** — developer-only, tapi fix koreksi langsung dan murah. → **patch** (applied, `err: unknown`)
- adv-8 — `updated_at` ter-bump tanpa perubahan — **false** — constraint frozen "Always: Setiap operasi tulis memperbarui updated_at" justru mensyaratkan perilaku ini.
- adv-9 — field salah tipe di PATCH diabaikan → pesan 400 membingungkan — **low** — UI sendiri selalu kirim tipe benar; fix menambah percabangan. → **reject**
- adv-10 / vg-1..4 — tidak ada test: create flow, partial merge updateProject, path 404, ordering listProjects — **medium** (vg pre-verified: pencarian `*.test.*`/`*.spec.*` = 0 file, package.json tanpa script test) — intent frozen "Never: Jangan mengintroduksi ORM/library baru" menutup penambahan test runner tanpa keputusan human. → **defer** (out of scope per intent)

Hasil routing: 0 intent_gap, 0 bad_spec, 12 temuan → patch (applied), 2 grup → defer, sisanya false/reject.

Tindak lanjut verifikasi (npm test / Playwright, 13 test): dua kegagalan awal diperbaiki — (1) test hapus kini menerima dialog konfirmasi baru; (2) akar nyata ditemukan: `datetime('now')` resolusi detik membuat `updated_at` bisa tie untuk aksi beruntun, dan UI tidak memindahkan item hasil edit ke atas — diperbaiki dengan presisi milidetik `strftime('%Y-%m-%d %H:%M:%f','now')` di create/update serta move-to-front di `handleUpdate`. Final: 13/13 test lulus, tsc bersih, smoke API (400 body null/array, limit 200/2000, id server-generated, 404 setelah delete) terverifikasi.

## Verification

**Commands:**
- `npm run lint` -- expected: tanpa error baru.
- `curl -s http://localhost:3000/api/projects | head` -- expected: `{"projects":[...]}` setelah tabel terbuat.

**Manual checks:**
- Buka `/dashboard`: buat proyek → muncul di daftar; edit → berubah + naik urutan; hapus → hilang; reload → data persisten.
- Buka `/` dan satu `/chat/[id]`: WhatsApp mode berperilaku normal.
