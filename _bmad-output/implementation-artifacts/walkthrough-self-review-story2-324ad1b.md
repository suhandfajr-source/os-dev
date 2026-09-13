# Self-Review Walkthrough & Detail Pass — Commit `324ad1b` (Story 2 Status Tahapan)

Tanggal: 2026-09-13 · Baseline: `6077a38` · Spec: `_bmad-output/specs/spec-meja-kendali/stories/2-status-tahapan.md`

Dokumen ini meriview ulang setiap analisis yang saya sampaikan saat walkthrough (orientation, trail, detail pass, machine hardening) terhadap kode aktual, mencatat klaim yang akurat, klaim yang perlu dikoreksi, dan temuan baru hasil verifikasi, lalu memberi rekomendasi perbaikan.

---

## Ringkasan Verdict

| # | Analisis | Status | Catatan |
|---|----------|--------|---------|
| 1 | Intent & stats orientation | ✅ Akurat | 1 catatan kecil (komit biner DB) |
| 2 | Concern 1 — derived status | ✅ Akurat | Nuansa status tak-dikenal tercakup |
| 3 | Concern 2 — migrasi guarded rename | ⚠️ Perlu koreksi | Klaim "setengah-migrasi" overstated; risiko nyata ada di lain tempat |
| 4 | Concern 3 — endpoint peta | ✅ Akurat | — |
| 5 | Concern 4 — chip UI + failure state | ✅ Akurat | — |
| 6 | Concern 5 — test | ✅ Akurat | 1 temuan baru (test menulis ke DB produksi) |
| 7 | Risk spot migrasi | ⚠️ Perlu koreksi | Lihat #3 |
| 8 | Risk spot API contract | ✅ Akurat | — |
| 9 | Risk spot tanpa CHECK constraint | ✅ Akurat | — |
| 10 | Risk spot skip stage diam-diam | ✅ Akurat | — |
| 11 | Risk spot pragma foreign_keys | ✅ Akurat | Diverifikasi: tidak ada `PRAGMA foreign_keys` eksplisit di kode |
| 12 | Machine hardening (triage log) | ✅ Akurat konten | Ada typo "这三" di output live — dibenahi di sini |

---

## Review per Analisis

### 1. Orientation — Intent & Surface Area Stats ✅

**Klaim:** 15 files changed · 4 modul (src, tests, data, _bmad-output) · ~250 baris logika · 3 boundary crossings · 5 interface publik baru.

**Verifikasi:**
- 15 files ✓ (`git show --stat`), 4 modul ✓.
- ~250 baris logika: masuk akal (db 87, page 72, route 16, types 10, tests ~126; sisanya dokumen review ~1.200 baris yang memang bukan logika).
- 5 interface publik ✓: `GET /api/projects/status`, `getAllStageStatuses()`, `StageName`, `StageStatusValue`, `ProjectStageStatuses`.
- Intent ditampilkan verbatim dari frozen section spec ✓.

**Temuan baru yang luput:** commit ini menyertakan **`data/assistant.db` sebagai file biner yang berubah** (262 KB → 274 KB). Perubahan isi database ikut ter-track git setiap commit — noisy diff, potensi konflik, dan riwayat commit membawa snapshot data.

**Rekomendasi:**
- Pertimbangkan `.gitignore` untuk `data/*.db` + biarkan migrasi `ensureDbInitialized` membuat/memigrasi schema saat boot (sudah mampu). Test API yang seed langsung ke DB perlu diarahkan ke DB test terpisah (lihat #6) agar tidak bergantung pada DB yang di-commit.

### 2. Concern 1 — Status tahap sebagai nilai derived ✅

**Klaim:** derived bukan tersimpan; aturan uniform approved > draft > kosong; R1 hanya planning & development. Stop di `src/lib/db/index.ts:246/239/272`.

**Verifikasi:** Semua akurat — `deriveStageStatus` (line 239), loop `COMPUTED_STAGES_R1` (line 272), peta semua proyek dengan default (line 246–254).

**Nuansa yang layak dicatat:** artifact dengan status di luar `approved`/`draft` (mis. typo `'aprroved'`) membuat stage tetap `belum_dimulai`/`draf` tanpa sinyal apa pun. Ini konsisten dengan kontrak, tapi rentan karena belum ada CHECK constraint (deferred) — lihat Risk Spot #9.

**Rekomendasi:**
- Saat story wizard R2 (saat CHECK constraint dikerjakan), tambahkan juga validasi status di layer aplikasi (insert helper) sehingga nilai invalid ditolak sedini mungkin, bukan hanya di skema.

### 3. Concern 2 & Risk Spot #1 — Migrasi guarded rename ⚠️ Perlu koreksi

**Klaim lama:** "kalau gagal di tengah (DROP INDEX sukses, ALTER gagal) database bisa tertinggal setengah-migrasi."

**Koreksi:** Klaim ini **overstated**. Urutannya `DROP INDEX IF EXISTS` → `ALTER TABLE ... RENAME`; jika ALTER gagal, boot berikutnya SELECT `sqlite_master` masih menemukan `artifacts`, lalu mengulang `DROP INDEX IF EXISTS` (no-op aman) dan ALTER lagi. Migrasi ini **idempoten dan self-recovering** — tidak ada state setengah-migrasi yang permanen.

**Risiko yang lebih nyata (temuan baru dari review ini):**
1. **Tanpa transaksi** — DROP INDEX dan ALTER berjalan sebagai statement terpisah. Sangat kecil kemungkinannya gagal terpisah pada SQLite lokal, tapi membungkusnya dalam transaksi membuatnya atomik secara eksplisit.
2. **`ensureDbInitialized` tidak promise-cached** (`src/lib/db/index.ts:18-19`) — hanya flag boolean. Pada cold start Next.js, beberapa request concurrent bisa masuk bersamaan sebelum `isInitialized = true`. Dengan satu instance client libsql statement terserialisasi sehingga kemungkinan besar aman, tapi ini bergantung pada perilaku internal client, bukan guard eksplisit. Skenario dev dengan HMR/multi-connection memperbesar risiko double-migration.

**Rekomendasi:**
- Bungkus blok migrasi (cek legacy → drop index → rename) dalam satu transaksi (`BEGIN`/`COMMIT`), atau minimal biarkan idempoten seperti sekarang tapi dokumentasikan asumsinya.
- Jadikan inisialisasi idempoten secara eksplisit: cache promise-nya, bukan flag —
  ```ts
  let initPromise: Promise<void> | null = null;
  export function ensureDbInitialized(): Promise<void> {
    initPromise ??= doInitialize();
    return initPromise;
  }
  ```
  Ini menutup race concurrent-init di semua skenario.

### 4. Concern 3 — Satu endpoint peta penuh ✅

**Klaim:** `GET /api/projects/status` shape `{ statuses }`; static segment aman dari `[id]`; tanpa endpoint per-proyek (keputusan terdokumentasi).

**Verifikasi:** Akurat. Shape sesuai pemakaian di `src/app/dashboard/page.tsx:46` (`data.statuses`). Prioritas static-over-dynamic segment memang perilaku Next.js. Keputusan anti-N+1 ada di Implementation Notes spec.

**Rekomendasi:** Tidak ada. (Kalau nanti ada konsumen kedua, shape `{ statuses }` masih cukup; kontrak tinggal dikunci di test.)

### 5. Concern 4 — Chip status + failure state ✅

**Klaim:** `statusLoadFailed` mencegah kegagalan fetch tampil sebagai "belum dimulai" palsu; aria-label per chip; delete membuang entri peta lokal tanpa fetch ulang.

**Verifikasi:** Akurat — `src/app/dashboard/page.tsx:37` (state), `:282-296` (render + aria), `:147-150` (delete lokal). Trade-off re-fetch penuh setelah create/edit sudah di-triage sebagai reject (dampak kecil).

**Rekomendasi:** Tidak ada perbaikan wajib. Opsional: saat `statusLoadFailed`, sediakan retry (tombol kecil) agar user tidak terjebak chip italic sampai navigasi ulang.

### 6. Concern 5 — Test derivasi & chip ✅ + temuan baru

**Klaim:** 4 test API + assertion e2e chip; cleanup via afterEach.

**Verifikasi:** Akurat — `tests/api/projects-status.spec.ts:50/69/88/106`, `afterEach → cleanup` (`:46-48`), e2e di `tests/e2e/dashboard.spec.ts:26`.

**Temuan baru:** Test **menulis langsung ke `data/assistant.db`** — database yang sama dengan yang dipakai aplikasi dev (dan yang di-commit ke git, lihat #1). `afterEach` mengurangi kebocoran, tapi test yang crash keras (kill proses) bisa meninggalkan project QA `QA-ST-*` di DB pengembang. E2E yang berjalan paralel dengan dev server juga berbagi state.

**Rekomendasi:**
- Arahkan test API ke DB terpisah (env var seperti `DB_PATH`/`DATABASE_URL` yang di-respect `src/lib/db/index.ts`, atau setup Playwright yang menyalin DB fixture sebelum suite).
- Minimal jangka pendek: beri prefix nama project QA yang sudah ada (`QA-ST-`) dan tambahkan skrip pembersihan satu perintah untuk sisa test yang crash.

### 7. Risk Spot #2 — Kontrak API `{ statuses }` ✅

**Verifikasi:** Akurat; endpoint baru dipakai langsung oleh dashboard tanpa lapisan adaptor. Perubahan shape berikutnya mematahkan semua kartu sekaligus.

**Rekomendasi:** Sudah ter-cover oleh test API; cukup jaga test sebagai kontrak (jangan longgarkan assertion shape tanpa update konsumen).

### 8. Risk Spot #3 — Tanpa CHECK constraint ✅ (deferred sadar)

**Verifikasi:** Akurat — `src/lib/db/index.ts:139-141` hanya `status TEXT NOT NULL DEFAULT 'draft'` dan `stage TEXT NOT NULL`, tanpa CHECK. Sudah di-triage sebagai defer ke R2 dengan alasan butuh migrasi tabel.

**Rekomendasi:** Pertahankan defernya, tapi tautkan eksplisit di `deferred-work.md` ke story wizard yang akan insert artifact — jangan sampai hanya hidup di Review Triage Log. (Sudah ada entri deferred-work untuk sebagian; pastikan CHECK constraint juga tercantum.)

### 9. Risk Spot #4 — Skip stage tak-dikenal diam-diam ✅

**Verifikasi:** Akurat — `src/lib/db/index.ts:262` `if (!ALL_STAGES.includes(stage)) continue;`. Ditambah temuan rekan satu kelas: `if (!out[pid]) continue;` di line 272 (artifact yatim) juga silent — tapi itu justru guard disengaja dengan komentar, dan cascade FK menjadikannya tak terjangkau.

**Rekomendasi:**
- Boleh sangat murah: `console.warn` satu baris saat stage tak-dikenal ditemukan, sehingga typo terlihat di log tanpa mengubah perilaku.

### 10. Risk Spot #5 — Ketergantungan pragma foreign_keys ✅

**Verifikasi:** Akurat — tidak ada `PRAGMA foreign_keys` eksplisit di `src/lib/db/index.ts`; integritas cascade bergantung pada client libsql yang mengaktifkannya. Triage memverifikasi live, tapi asumsi tetap implisit terhadap versi client.

**Rekomendasi:**
- Murah dan eksplisit: jalankan `PRAGMA foreign_keys = ON;` sekali di awal `ensureDbInitialized` (no-op kalau sudah aktif). Mengubah asumsi perilaku client menjadi kontrak kode.

### 11. Machine Hardening (Review Triage Log) ✅ konten, typo dibenahi

**Koreksi presentasi:** Di output live saya menulis "Kalau R2 molor, **这三** juga molor" — tiga karakter Mandarin slips in; seharusnya "**tiga defer ini** juga molor". Isi analisis (3 defer, 2 false-claim, 2 reject) sudah diverifikasi cocok dengan Review Triage Log di spec.

---

## Rekomendasi Terkonsolidasi (prioritas)

1. **[medium] Isolasi DB test** — test API jangan menulis ke `data/assistant.db` produksi (lihat #6); sekaligus membuka jalan meng-ignore DB biner dari git (#1).
2. **[medium] Promise-cache `ensureDbInitialized`** — tutup race concurrent-init secara eksplisit (#3.2).
3. **[low] `PRAGMA foreign_keys = ON` eksplisit** (#10) dan bungkus migrasi rename dalam transaksi (#3.1).
4. **[low] `console.warn` untuk stage tak-dikenal** (#9) + catat CHECK constraint di `deferred-work.md` (#8).
5. **[opsional] Tombol retry saat `statusLoadFailed`** (#5).

Tidak ada rekomendasi yang mengubah perilaku fitur — semuanya memperkuat asumsi yang selama ini implisit. Poin 1–2 layak masuk story wizard R2; poin 3–5 bisa di-patch kapan saja tanpa risiko.

---

## Kesimpulan

Dari 12 butir analisis yang direview: 10 akurat penuh, 2 perlu koreksi (keduanya soal migrasi rename — terlalu dramatis soal mode gagal, dan justru kurang tajam soal race inisialisasi), plus 2 temuan baru (DB biner ter-commit, test menulis ke DB produksi). Tidak ada klaim pada walkthrough yang salah arah secara desain; detail pass tetap valid sebagai peta risiko setelah koreksi.
