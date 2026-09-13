# Rangkuman Review — Story 2 "Status Tahapan" (CAP-4)

**Konten yang direview:** unified diff Story 2 — `src/app/api/projects/status/route.ts` (baru), `src/app/dashboard/page.tsx`, `src/lib/db/index.ts`, `src/types/index.ts`
**Baseline:** commit `6077a38` · **Spec:** `_bmad-output/specs/spec-meja-kendali/stories/2-status-tahapan.md`
**Lens yang dijalankan:** Verification Gap, Blind Hunter, Edge-Case Hunter (+ deletion check, claims check)
**File sumber:** `review-story2-verification-gap.md` · `review-story2-blind-hunter-findings.md` · `review-story2-edge-case-hunter-findings.md`

**Total temuan: 21** — 2 verification gap, 12 blind hunter, 6 edge-case hunter (+1 klaim low-confidence). Tanpa severity/prioritas, sesuai format lensa.

---

## 1. Verification Gap (2 temuan)

Semua perilaku baru Story 2 **tidak dieksekusi oleh satu pun test** di jalur verifikasi normal (`npm test` → Playwright `testDir: ./tests`). Pencarian simbol `getAllStageStatuses|projects/status|deriveStageStatus|artifacts` atas seluruh repo: nol test. Satu-satunya jejak verifikasi adalah `qa-seed-status.cjs` — skrip seed manual tanpa assertion, tidak dijalankan `npm test`.

### 1.1 Aturan derivasi status `getAllStageStatuses` tidak dijaga test — Regression gap
- **Changed surface:** `src/lib/db/index.ts:237-262` — kontrak: `approved`→`selesai`, `draft` tanpa `approved`→`draf`, kosong→`belum_dimulai`; hanya `planning`/`development` dihitung (`COMPUTED_STAGES_R1`, baris 223); stage di luar `ALL_STAGES` dibuang.
- **Consumer:** `GET /api/projects/status` (`route.ts:8`) → `fetchStageStatuses` (`page.tsx:38`).
- **Demonstration:** jika `deriveStageStatus` terbalik, `COMPUTED_STAGES_R1` terhapus, atau query gagal (500), tidak ada test yang gagal.
- **Disposition: patch** — tambah test API di `tests/api/projects.spec.ts` (marker `QA-`, cleanup via DELETE): seed artifact via `@libsql/client`, assert nilai per stage, hapus rows di cleanup.

### 1.2 Chip status 6 tahap di Dashboard tidak diproteksi test e2e — Regression gap
- **Changed surface:** render chip di `page.tsx:272-289` + refresh setelah create/edit (`:86,120`) + buang saat delete (`:141-144`).
- **Consumer:** `/dashboard`, diverifikasi `tests/e2e/dashboard.spec.ts` (4 test — semua hanya assert nama/deskripsi/urutan/visibilitas; grep `selesai|draf|chip` atas `tests/` → nol).
- **Demonstration:** blok chip terhapus atau `statusChipClass` salah → keempat test e2e tetap lolos.
- **Disposition: patch** — extend test "buat proyek": assert 6 elemen ber-title `'Belum dimulai'` visible (tidak butuh data artifact).

### Catatan lintas lens (overlap = sinyal)
Temuan "tidak ada test sama sekali" juga muncul di Blind Hunter (#10) — tiga lensa konvergen bahwa verifikasi adalah celah terbesar perubahan ini.

---

## 2. Blind Hunter (12 temuan)

Sumber: `review-story2-blind-hunter-findings.md` (floor N=4, ditemukan 12).

1. **FK cascade tidak dijamin aktif** — libsql/SQLite butuh `PRAGMA foreign_keys = ON` per koneksi; tidak ada di `db/index.ts`, dan `deleteProject` tidak menghapus artifacts eksplisit → artifacts yatim menumpuk.
2. **`getAllStageStatuses` bisa mengembalikan proyek yang sudah dihapus** — query murni dari artifacts tanpa join/validasi ke tabel `projects` (kombinasi dengan #1).
3. **Delete proyek tidak membersihkan artifacts di sisi server** — frontend hanya menghapus `stageStatuses[id]` lokal; menyembunyikan masalah orphan, bukan memperbaikinya.
4. **Tidak ada constraint integritas pada `artifacts`** — tidak ada `CHECK (status IN ('draft','approved'))`, `CHECK (stage IN (...))`, `UNIQUE (project_id, stage, type)`; baris rusak diam-diam dilewati loop.
5. **`updated_at` artifacts tidak akan pernah berubah** — hanya `DEFAULT CURRENT_TIMESTAMP`; tanpa trigger/kode update; gampang terlewat di R2.
6. **Silent failure frontend tanpa indikator** — fetch gagal → semua chip jatuh ke `'belum_dimulai'`; tidak ada pembedaan visual "belum dimulai" vs "gagal memuat", tidak ada retry.
7. **Query full-scan tidak memanfaatkan index** — `SELECT ... FROM artifacts` tanpa agregasi; `idx_artifacts_project_stage` tidak terpakai; bisa dihitung di SQL (`GROUP BY project_id, stage`).
8. **Re-fetch penuh setiap mutasi** — `handleCreate`/`handleUpdate` memanggil `fetchStageStatuses()` untuk *semua* proyek padahal satu yang berubah; proyek baru selalu kosong di R1 sehingga panggilan percuma.
9. **Tidak ada endpoint per-proyek** — hanya peta global; sesuai keputusan story, tapi tidak bisa menyaring per `project_id` jika list jadi paginasi.
10. **Tidak ada test sama sekali** — `deriveStageStatus` logika murni mudah dites; route bisa diuji integration. (≈ Verification Gap 1.1)
11. **Aksesibilitas chip** — status hanya via `title` pada `<span>`; tidak terbaca screen reader / sentuh; tidak ada `aria-label`.
12. **Pemetaan status dua-bahasa implisit** — DB `draft`/`approved` (EN) vs API `draf`/`selesai`/`belum_dimulai` (ID); translasi tersebar di `deriveStageStatus` + komentar, tidak didokumentasikan sebagai kontrak API.

---

## 3. Edge-Case Hunter (5 edge + 1 klaim)

Sumber: `review-story2-edge-case-hunter-findings.md`. Deletion check: bersih (diff hanya menambah kode).

1. **Respons non-ok diabaikan diam-diam** — `page.tsx:34-45`, cabang `if (res.ok)` tanpa else; chip tampil "belum dimulai" seolah fakta.
2. **Race condition fetch beruntun** — `page.tsx:86,120`, fetch tanpa await bisa selesai tidak berurutan; respons basi menimpa status terbaru. Fix: `AbortController`.
3. **`artifact.status` di luar `approved`/`draft` tidak terjaga** — `db/index.ts:228-232`; skema tanpa CHECK → tahap ber-artefak diam-diam tampil "belum dimulai".
4. **FK cascade tidak aktif (PRAGMA default OFF)** — `db/index.ts:124-139`; fix: `PRAGMA foreign_keys = ON` atau `DELETE FROM artifacts WHERE project_id = ?` di `deleteProject`.
5. **Full scan tabel artifacts tanpa batas** — `db/index.ts:234-239`; latensi dashboard memburuk seiring baris tumbuh. Fix: agregasi di SQL.
6. **Klaim (confidence: low):** Intent menyebut tabel `artifact` (singular, kontrak `architecture-diagrams.md`), kode membuat `artifacts` (plural) — story berikutnya yang insert ke `artifact` sesuai kontrak akan gagal; perlu disamakan atau Intent direnegosiasi.

Klaim yang terverifikasi: status derived dari `approved` per stage ✔; baris 6 tahap tampil di kartu ✔; 4 tahap non-R1 tetap "belum dimulai" ✔.

---

## 4. Klaster Temuan (lintas lens)

| Klaster | Sumber lensa | Inti |
|---|---|---|
| **Verifikasi absen** | Verification Gap 1.1–1.2, Blind #10 | Seluruh fitur baru tanpa satu pun test; `qa-seed-status.cjs` tidak meng-assert apa pun |
| **Orphan artifacts** | Blind #1–3, Edge #4 | FK cascade tidak aktif + tanpa cleanup server-side → status proyek terhapus bisa tetap terhitung |
| **Silent degradation** | Blind #6, Edge #1, #3 | Kegagalan fetch / status tak dikenal jatuh diam-diam ke "belum dimulai" |
| **Skalabilitas query** | Blind #7–8, Edge #5 | Full scan tanpa agregasi + re-fetch penuh tiap mutasi |
| **Kontrak & skema** | Blind #4, #12, Edge #3, #6 | Tanpa CHECK/UNIQUE, pemetaan EN→ID implisit, nama tabel `artifacts` vs kontrak `artifact` |
| **Aksesibilitas & R2 hygiene** | Blind #5, #11, #9 | Chip hanya via `title`, `updated_at` beku, tanpa endpoint per-proyek |

---

## 5. Rekomendasi Tindakan (urutan pengerjaan)

1. **Patch test (Verification Gap 1.1 & 1.2)** — satu test API derivasi + satu assertion chip e2e. Prasyarat triase, biaya kecil.
2. **Aktifkan `PRAGMA foreign_keys = ON`** atau hapus artifacts eksplisit di `deleteProject` (Blind #1–3, Edge #4) — memperbaiki bug data, bukan hanya catatan.
3. **Tambah `CHECK` constraint pada `status`/`stage`** + putuskan nama tabel `artifacts` vs `artifact` sebelum story wizard berikutnya (Blind #4, Edge #3, #6) — makin lambat diputus, makin mahal migrasinya.
4. **Agregasi status di SQL + hindari re-fetch penuh** (Blind #7–8, Edge #5) — bisa `defer` untuk R2 karena skala personal.
5. **Sisanya (defer):** silent-failure indicator, race `AbortController`, aksesibilitas chip, `updated_at` trigger, endpoint per-proyek, dokumentasi pemetaan status — nyata tapi bukan bagian penutupan Story 2.
