# Hasil Review — Story 2 "Status Tahapan" (Blind Hunter)

**Sumber:** `review-story2-blind-hunter.md`
**Ruang lingkup:** Unified diff Story 2 — `src/app/api/projects/status/route.ts`, `src/app/dashboard/page.tsx`, `src/lib/db/index.ts`, `src/types/index.ts`
**Metode floor temuan:** ukuran konten diff ≈ 9,99 kB → N = min(⌊√9,99⌋ + 1, 10) = **4** temuan minimum. Ditemukan **12**.

---

## Temuan

1. **FK cascade tidak dijamin aktif** — Tabel `artifacts` bergantung pada `FOREIGN KEY ... ON DELETE CASCADE`, tetapi di libsql/SQLite foreign keys tidak aktif kecuali `PRAGMA foreign_keys = ON` dieksekusi per koneksi. Tidak ada pragma di `src/lib/db/index.ts` dan `deleteProject` tidak menghapus artifacts secara eksplisit; jika pragma mati, artifacts yatim menumpuk.

2. **`getAllStageStatuses` mengembalikan proyek yang sudah tidak ada** — Query `SELECT project_id, stage, status FROM artifacts` membangun output murni dari artifacts, tanpa join/validasi terhadap tabel `projects`. Dikombinasikan dengan temuan #1 (cascade tidak dijamin), payload bisa berisi entri untuk proyek yang telah dihapus. Minimal perlu `WHERE project_id IN (SELECT id FROM projects)` atau join.

3. **Tidak ada penghapusan artifacts di sisi server untuk alur delete** — Frontend menghapus `stageStatuses[id]` secara lokal (`delete next[id]`), tetapi ini hanya menyembunyikan masalah orphan data di DB alih-alih memperbaiki sumbernya.

4. **Tidak ada constraint integritas pada tabel artifacts** — Tidak ada `CHECK (status IN ('draft','approved'))`, `CHECK (stage IN (...))`, maupun `UNIQUE (project_id, stage, type)`. Baris dengan `stage` acak (mis. typo) diam-diam dilewati loop (`if (!ALL_STAGES.includes(stage)) continue;`) sehingga data rusak tidak terdeteksi.

5. **`updated_at` tidak akan pernah berubah** — Kolom hanya punya `DEFAULT CURRENT_TIMESTAMP`; belum ada trigger `ON UPDATE` maupun kode yang men-set ulang. Ketika R2 menambah update artifact, ini gampang terlewat; kontrak skema menyebut timestamps sebagai bagian dari kontrak.

6. **Silent failure di frontend tanpa indikator** — Jika `fetch('/api/projects/status')` gagal (res tidak ok atau exception), semua chip jatuh ke fallback `'belum_dimulai'` per kartu. Tidak ada pembedaan visual antara "benar-benar belum dimulai" dan "gagal memuat", tidak ada retry.

7. **Query full-scan yang tidak memanfaatkan index** — `SELECT project_id, stage, status FROM artifacts` tanpa WHERE membuat `idx_artifacts_project_stage` tidak terpakai, dan seluruh tabel dipindai lalu diagregasi di JS. Bisa diselesaikan di SQL dengan `GROUP BY project_id, stage` + agregasi status, yang juga mengurangi transfer data.

8. **Re-fetch penuh setelah setiap mutasi** — `handleCreate` dan `handleUpdate` memanggil `fetchStageStatuses()` (tanpa await) yang mengambil ulang peta untuk *semua* proyek padahal hanya satu proyek yang berubah; status proyek baru juga selalu kosong di R1 sehingga panggilan ini percuma.

9. **Tidak ada endpoint per-proyek** — Hanya `GET /api/projects/status` (peta global). Sesuai kontrak di context, tetapi tidak ada jalur untuk mengambil status satu proyek; jika Dashboard menjadi list paginasi, endpoint ini tidak menyaring per `project_id`.

10. **Tidak ada test sama sekali** — `deriveStageStatus` adalah logika murni yang mudah dites (approved → selesai, draft-only → draf, kosong → belum_dimulai, status tak dikenal), dan route-nya bisa diuji integration; diff tidak memuat satu pun test.

11. **Aksesibilitas chip** — Status hanya disampaikan via `title` pada `<span>`, yang tidak terbaca pembaca layar maupun perangkat sentuh; tidak ada `aria-label` atau teks status eksplisit.

12. **Pemetaan status dua-bahasa implisit** — DB memakai `draft`/`approved` (Inggris), API mengembalikan `draf`/`selesai`/`belum_dimulai` (Indonesia), dan translasinya tersebar implisit di `deriveStageStatus` + komentar. Tidak ada tipe/const tunggal yang mendokumentasikan pemetaan ini sebagai kontrak API (mis. di `src/types/index.ts` atau doc).
