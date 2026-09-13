# Rangkuman Review — Story 2 (Status Tahapan) · Lens: Edge-Case Hunter

- **Konten:** diff story 2 — endpoint `/api/projects/status`, chip 6 tahap di Dashboard, tabel `artifacts` + `getAllStageStatuses()`, tipe `StageName`/`StageStatusValue`/`ProjectStageStatuses`
- **Metode:** edge-case-hunter (path tracing) + deletion check + claims check (spec: `SPEC story 2`, kontrak skema: `architecture-diagrams.md`)
- **Hasil:** 5 temuan edge-case + 1 temuan klaim (confidence rendah). Deletion check: bersih (tidak ada kode bermakna yang dihapus). Tidak ada label severity/prioritas sesuai format lensa.

## 1. Respons non-ok dari endpoint status diabaikan diam-diam

- **Lokasi:** `src/app/dashboard/page.tsx:34-45` (`fetchStageStatuses`)
- **Pemicu:** `GET /api/projects/status` mengembalikan non-ok; cabang `if (res.ok)` tidak punya else
- **Perbaikan:** tambahkan penanganan else, mis. `console.error('stage status fetch failed', res.status); setStatusLoadFailed(true);`
- **Konsekuensi:** chip tahap menampilkan "belum_dimulai" seolah fakta, padahal data gagal dimuat

## 2. Race condition pada fetch status yang saling menimpa

- **Lokasi:** `src/app/dashboard/page.tsx:86,120` (pemanggilan `fetchStageStatuses()` tanpa await)
- **Pemicu:** create/edit beruntun memicu beberapa fetch yang tumpang tindih; respons bisa selesai tidak berurutan
- **Perbaikan:** gunakan `AbortController` — batalkan request sebelumnya sebelum fetch baru (`fetch('/api/projects/status', { signal: ctrl.signal })`)
- **Konsekuensi:** respons basi menimpa status terbaru pada chip tahap

## 3. Nilai `artifact.status` di luar `approved`/`draft` tidak terjaga

- **Lokasi:** `src/lib/db/index.ts:228-232` (`deriveStageStatus`)
- **Pemicu:** ada `status` di luar `'approved'`/`'draft'` — skema tidak punya constraint CHECK
- **Perbaikan:** `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved'))`
- **Konsekuensi:** tahap yang punya artefak tetap diam-diam tampil "belum_dimulai"

## 4. Foreign key cascade tidak aktif (PRAGMA default OFF)

- **Lokasi:** `src/lib/db/index.ts:124-139` (DDL `artifacts`, `FOREIGN KEY ... ON DELETE CASCADE`)
- **Pemicu:** SQLite menonaktifkan foreign key secara default; tidak ada `PRAGMA foreign_keys = ON` yang dieksekusi
- **Perbaikan:** `await client.execute('PRAGMA foreign_keys = ON');` — atau hapus artifacts manual di `deleteProject` (`DELETE FROM artifacts WHERE project_id = ?`)
- **Konsekuensi:** menghapus proyek meninggalkan baris artifact yatim yang tetap masuk peta status

## 5. Full scan tabel artifacts tanpa batas

- **Lokasi:** `src/lib/db/index.ts:234-239` (`getAllStageStatuses`, SELECT tanpa agregasi)
- **Pemicu:** tabel `artifacts` tumbuh tanpa batas; setiap load dashboard memindai dan menampung semua baris di memori JS
- **Perbaikan:** hitung di SQL, mis. `SELECT project_id, stage, MAX(status = 'approved') AS has_approved, MAX(status = 'draft') AS has_draft FROM artifacts GROUP BY project_id, stage`
- **Konsekuensi:** latensi dashboard dan `/api/projects/status` memburuk seiring baris bertambah

## 6. Klaim: nama tabel tidak persis mengikuti kontrak skema (klaim, confidence: low)

- **Lokasi:** `src/lib/db/index.ts:127` (`CREATE TABLE artifacts`)
- **Klaim (Intent):** "Tabel `artifact` dibuat persis mengikuti kontrak skema inti" — kontrak di `architecture-diagrams.md` menamai tabel `artifact`, kode membuat `artifacts` (plural)
- **Perbaikan:** samakan nama tabel dengan kontrak (`artifact`) atau renegotiasi redaksi Intent yang frozen
- **Konsekuensi:** story berikutnya yang insert ke `artifact` sesuai kontrak akan gagal; ambiguitas di migrasi mendatang

## Klaim yang terverifikasi (tanpa temuan)

- Status tahap dihitung (derived, tidak disimpan) dari `artifact.status = approved` per stage — sesuai kode.
- Baris 6 tahap tampil di kartu proyek Dashboard — sesuai `STAGE_ORDER`.
- Empat tahap non-R1 tetap "belum dimulai" — sesuai `defaultStageStatuses` + `COMPUTED_STAGES_R1`.
- Deletion check: bersih — diff hanya menambah kode, tidak menghapus perilaku yang ada.
