- source_spec: docs/specs/spec-dokumentasi-tools/stories/1-fondasi-kb-bertipe-fts.md
  summary: Kolom updated_at pada knowledge_entries tidak otomatis ter-update saat UPDATE (SQLite tanpa ON UPDATE); fungsi update di S4 wajib set updated_at eksplisit.
  evidence: Perilaku SQLite standar; verifikasi dengan PRAGMA table_info dan smoke test update.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: Tidak ada autentikasi/otorisasi di endpoint /api/projects (GET/POST/PATCH/DELETE terbuka penuh).
  evidence: Real (terverifikasi di kode), tetapi intent frozen story ini menyatakan eksplisit "Never: Tanpa auth/role (personal tool single-user)". Perlu keputusan human jika aplikasi kelak diekspos ke jaringan — desain auth tidak boleh diinfer dari intent saat ini.
- source_spec: `_bmad-output/specs/spec-meja-kendali/stories/1-fondasi-proyek.md`
  summary: Tidak ada automated test untuk CRUD proyek (create flow, partial-merge updateProject, path 404, ordering listProjects) — verification-gap layer pre-verified: 0 file test di repo, package.json tanpa script test.
  evidence: Intent frozen "Never: Jangan mengintroduksi ORM/library baru" menutup penambahan test runner (vitest/jest) dari patch loop ini. Untuk menutup gap: human memutuskan menambah test runner sebagai dev-dependency, lalu buat test route handler dengan libsql in-memory; sampai itu, verifikasi tetap manual via curl + UI per bagian Verification spec.
