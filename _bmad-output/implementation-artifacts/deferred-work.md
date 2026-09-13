- source_spec: docs/specs/spec-dokumentasi-tools/stories/1-fondasi-kb-bertipe-fts.md
  summary: Kolom updated_at pada knowledge_entries tidak otomatis ter-update saat UPDATE (SQLite tanpa ON UPDATE); fungsi update di S4 wajib set updated_at eksplisit.
  evidence: Perilaku SQLite standar; verifikasi dengan PRAGMA table_info dan smoke test update.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: Tidak ada autentikasi/otorisasi di endpoint /api/projects (GET/POST/PATCH/DELETE terbuka penuh).
  evidence: Real (terverifikasi di kode), tetapi intent frozen story ini menyatakan eksplisit "Never: Tanpa auth/role (personal tool single-user)". Perlu keputusan human jika aplikasi kelak diekspos ke jaringan — desain auth tidak boleh diinfer dari intent saat ini.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: [DITUTUP oleh sesi QA] Tidak ada automated test untuk CRUD proyek — kini ter-cover 13 test Playwright (tests/api/projects.spec.ts + tests/e2e/dashboard.spec.ts, runner @playwright/test sebagai devDependency).
  evidence: Gap asli terverifikasi (0 file test saat itu), lalu sesi bmad-qa-generate-e2e-tests menambahkan test runner + 13 test yang lulus penuh; entry ini tersisa sebagai catatan riwayat.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/2-status-tahapan.md`
  summary: Tabel artifact belum punya CHECK constraint (status IN draft|approved, stage valid) dan updated_at belum pernah di-set ulang saat UPDATE.
  evidence: Real (review triage story 2, low); migrasi tabel paling murah dikerjakan bareng story wizard R2 saat insert/update artifact jadi jalur nyata — pelajaran deferred-work knowledge_entries (SQLite tanpa ON UPDATE, wajib set eksplisit).
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/2-status-tahapan.md`
  summary: getAllStageStatuses memindai seluruh tabel artifact tanpa agregasi SQL (GROUP BY) — latensi /api/projects/status tumbuh seiring volume.
  evidence: Real (review triage story 2, low); skala personal membuatnya diabaikan sekarang; pertimbangkan agregasi di SQL atau endpoint per-proyek saat wizard stories mengisi artifact secara rutin.
