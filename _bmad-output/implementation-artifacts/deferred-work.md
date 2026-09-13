- source_spec: docs/specs/spec-dokumentasi-tools/stories/1-fondasi-kb-bertipe-fts.md
  summary: Kolom updated_at pada knowledge_entries tidak otomatis ter-update saat UPDATE (SQLite tanpa ON UPDATE); fungsi update di S4 wajib set updated_at eksplisit.
  evidence: Perilaku SQLite standar; verifikasi dengan PRAGMA table_info dan smoke test update.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: Tidak ada autentikasi/otorisasi di endpoint /api/projects (GET/POST/PATCH/DELETE terbuka penuh).
  evidence: Real (terverifikasi di kode), tetapi intent frozen story ini menyatakan eksplisit "Never: Tanpa auth/role (personal tool single-user)". Perlu keputusan human jika aplikasi kelak diekspos ke jaringan — desain auth tidak boleh diinfer dari intent saat ini.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: [DITUTUP oleh sesi QA] Tidak ada automated test untuk CRUD proyek — kini ter-cover 13 test Playwright (tests/api/projects.spec.ts + tests/e2e/dashboard.spec.ts, runner @playwright/test sebagai devDependency).
  evidence: Gap asli terverifikasi (0 file test saat itu), lalu sesi bmad-qa-generate-e2e-tests menambahkan test runner + 13 test yang lulus penuh; entry ini tersisa sebagai catatan riwayat.
