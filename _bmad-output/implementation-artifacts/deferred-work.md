- source_spec: docs/specs/spec-dokumentasi-tools/stories/1-fondasi-kb-bertipe-fts.md
  summary: Kolom updated_at pada knowledge_entries tidak otomatis ter-update saat UPDATE (SQLite tanpa ON UPDATE); fungsi update di S4 wajib set updated_at eksplisit.
  evidence: Perilaku SQLite standar; verifikasi dengan PRAGMA table_info dan smoke test update.
