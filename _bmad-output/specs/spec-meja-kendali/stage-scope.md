# Stage Scope — Peran Asisten per Tahap

Mesin adalah **asisten, bukan eksekutor**. Tiga kerja universal di semua tahap:

1. **Draft** — membuatkan draf dari apa yang user putuskan
2. **Record** — mencatat apa yang terjadi dan diputuskan
3. **Remind** — mengetahui apa yang harus dikerjakan berikutnya

Eksekusi tetap di "meja kerja lain": user + coding agent + tool eksternal.

| Tahap | 🔨 Draft | 📝 Record | 🔔 Remind |
|---|---|---|---|
| **Planning** | Brief dari tanya-jawab, draf PRD/spec, daftar pertanyaan yang belum dijawab | Keputusan & alasannya | Pertanyaan kritis yang belum terjawab |
| **Design** | Deskripsi wireframe, diagram alur (mermaid), draf keputusan arsitektur | Keputusan design & trade-off, kenapa pilih X bukan Y | Bagian design yang belum diputuskan |
| **Development** | Story/task terpecah rapi, paket handoff untuk coding agent (spec + kriteria selesai) | Status per story, changelog, keputusan teknis, catatan bug | Story yang belum selesai, dependensi antar task |
| **Testing** | Test plan & test case per story, acceptance criteria | Hasil test manual (lolos/gagal + bukti), daftar bug | Test yang belum dijalankan, bug yang belum ditutup |
| **Deployment** | Checklist pre-deploy, file konfigurasi CI/CD (yml), panduan deploy per stack | Log deploy: tanggal, versi, perubahan, rencana rollback | Checklist yang belum dicentang |
| **Maintenance** | Rencana monitoring (apa, tool apa, cara setup), template retrospective | Catatan insiden & penanganan, hasil retro, pelajaran | Hal yang perlu dicek berkala |

Pola: draft makin teknis ke kanan, record makin operasional ke kanan. Asisten tidak pernah mengeksekusi — yang berubah hanya objeknya per tahap.
