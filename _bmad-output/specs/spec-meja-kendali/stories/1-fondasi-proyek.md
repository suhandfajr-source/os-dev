---
title: 'Fondasi Proyek — entitas, API, dan daftar proyek'
type: 'feature'
created: '2026-09-13'
status: 'ready-for-dev'
route: 'dispatch'
review_loop_iteration: 0
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

## Verification

**Commands:**
- `npm run lint` -- expected: tanpa error baru.
- `curl -s http://localhost:3000/api/projects | head` -- expected: `{"projects":[...]}` setelah tabel terbuat.

**Manual checks:**
- Buka `/dashboard`: buat proyek → muncul di daftar; edit → berubah + naik urutan; hapus → hilang; reload → data persisten.
- Buka `/` dan satu `/chat/[id]`: WhatsApp mode berperilaku normal.
