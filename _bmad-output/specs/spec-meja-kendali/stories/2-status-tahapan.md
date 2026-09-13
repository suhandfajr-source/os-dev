---
title: 'Status Tahapan — Planning & Development'
type: 'feature'
created: '2026-09-13'
status: 'done'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '6077a388bc24fb79528acbfe9ab3d334d8321fdf'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Meja Kendali belum bisa menjawab "proyek ini sudah sampai mana?" — CAP-4: user perlu melihat status tiap tahapan (selesai/belum) dan apa yang belum dikerjakan, sebagai disiplin advisory (CAP-7) tanpa mengunci tahapan. Di R1 status cukup untuk tahap Planning dan Development; empat tahap lain tampil "belum dimulai" (mesin 6 tahap penuh tuntas di R2).

**Approach:** Tabel `artifact` dibuat persis mengikuti kontrak skema inti di `architecture-diagrams.md`; status tahap **dihitung** (derived, tidak disimpan) dari `artifact.status = approved` per stage via endpoint status per proyek, dan ditampilkan sebagai baris status 6 tahap di kartu proyek Dashboard. Status wisaya lain (wizard) akan mengisi tabel ini di story berikutnya.

</frozen-after-approval>

## Implementation Notes

- `src/types/index.ts` — tambah `StageName`, `StageStatusValue`, `ProjectStageStatuses`.
- `src/lib/db/index.ts` — tabel `artifact` (kontrak skema inti; migrasi terjaga dari nama awal `artifacts`) + index `(project_id, stage)`; fungsi `getAllStageStatuses()` menghitung status per proyek dari artifact (derived, tidak disimpan); peta memuat SEMUA proyek (default untuk yang tanpa artifact); R1 hanya menghitung `planning` & `development`, 4 tahap lain tetap `belum_dimulai` sesuai stories.yaml (tuntas di R2).
- `src/app/api/projects/status/route.ts` — BARU: GET peta status semua proyek dalam satu fetch; static segment `status` aman dari conflict dengan `[id]`.
- `src/app/dashboard/page.tsx` — chip status 6 tahap di kartu proyek (hijau=selesai, kuning=draf, abu=belum); refresh status setelah create/edit, dibuang saat delete.
- Keputusan: aturan status uniform untuk semua stage (selesai = ≥1 approved; draf = ≥1 draft tanpa approved) — persis kontrak elicitation; wizard stories berikutnya cukup insert artifacts.
- Keputusan: tidak ada endpoint per-proyek (N+1 dihindari) — UI personal, satu endpoint peta penuh cukup.
- Pasca-walkthrough (324ad1b) — hardening tanpa perubahan perilaku fitur: (1) isolasi DB test — `DB_PATH` env di-respect `db/index.ts`, Playwright memakai `data/test-e2e.db` di port 3100 dengan server sendiri; (2) `ensureDbInitialized` promise-cached (tutup race concurrent-init); (3) `PRAGMA foreign_keys = ON` eksplisit + migrasi rename atomik via `client.batch`; (4) `console.warn` stage tak-dikenal; (5) tombol retry saat status gagal dimuat. DB biner `data/assistant.db` masih di-track git (keputusan workflow user, terbuka untuk dibahas).

## Review Triage Log

Review loop 0 — sumber: verification-gap (2, pre-verified) + blind-hunter (12) + edge-case-hunter (5+1 klaim) = 21 temuan. Hasil triase:

- VG 1.1 + VG 1.2 + Blind #10 — seluruh fitur status tanpa satu pun test — **medium** → **patch (applied)**: `tests/api/projects-status.spec.ts` (4 test derivasi, seed artifact via @libsql/client) + assertion chip 6 tahap di `tests/e2e/dashboard.spec.ts`. Test langsung menangkap gap nyata: peta status tadinya tak memuat proyek tanpa artifact — diperbaiki (default untuk semua proyek).
- Edge #6 — nama tabel `artifacts` vs kontrak `artifact` (singular) — **medium** → **patch (applied)**: tabel direname + migrasi terjaga (guarded ALTER) di `ensureDbInitialized`.
- Blind #6 + Edge #1 — fetch status gagal jatuh diam-diam ke "belum dimulai" (menyesatkan) — **medium** → **patch (applied)**: state `statusLoadFailed` + chip italic ber-title "Status gagal dimuat".
- Blind #11 — chip hanya `title`, tak terbaca screen reader — **low** → **patch (applied)**: `aria-label` per chip.
- Blind #12 — pemetaan status EN→ID implisit — **low** → **patch (applied)**: komentar kontrak di `src/types/index.ts`.
- Blind #1/#2/#3 + Edge #4 — cascade FK tidak aktif → orphan artifacts — **false** — terbantahkan uji live: `DELETE FROM projects` terbukti menghapus artifacts via cascade (peta status kembali `{}`); libsql client mengaktifkan foreign_keys.
- Blind #9 — tanpa endpoint per-proyek — **false** — keputusan desain terdokumentasi di Implementation Notes, bukan defect.
- Edge #2 — race fetch beruntun (AbortController) — **low, reject** — single-user lokal, praktis tak terjangkau; fix menambah kompleksitas.
- Blind #8 — re-fetch penuh tiap mutasi — **low, reject** — dampak dapat diabaikan; refetch menjaga kebenaran.
- Blind #4 + Edge #3 — tanpa CHECK constraint status/stage — **low → defer** — butuh migrasi tabel; pas dikerjakan bareng story wizard R2 saat insert artifact jadi nyata.
- Blind #5 — `updated_at` artifact tidak pernah ter-update — **low → defer** — belum ada path update; disiplin eksplisit set updated_at wajib saat story wizard (pelajaran: deferred-work knowledge_entries).
- Blind #7 + Edge #5 — full scan tanpa agregasi SQL — **low → defer** — skala personal; pertimbangkan GROUP BY di SQL saat volume wizard bertambah.
