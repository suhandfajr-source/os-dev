---
title: Spec — Dokumentasi Tools
date: 2026-02-14
status: active
companions:
  - chat-flows.md
sources:
  - ../../forge/dokumentasi-tools/forged-idea.md
---

# SPEC — Dokumentasi Tools

Knowledge base pribadi untuk vibe coder pemula: mesin menjelaskan tools baru, menyimpannya setelah konfirmasi, dan menariknya kembali secara otomatis- hemat saat dibutuhkan — semuanya di dalam ruang chat yang sudah ada.

## Why

Vibe coder pemula menemukan tools baru terus-menerus, memahaminya sekali, lalu melupakannya. Pengetahuan itu hilang di riwayat chat. Fitur ini mengubah obrolan sekali-jadi menjadi memori yang bisa ditarik kembali, memperluas Kamus Vibe Coder dari "istilah" ke "tools nyata".

## Capabilities

### CAP-1 — Simpan terkonfirmasi
- **Intent:** Saat jawaban mesin menyentuh tools/library/layanan/konsep, mesin menawarkan penyimpanan lewat quick reply chips (Simpan/Edit/Skip); entri hanya tercipta dari aksi eksplisit user.
- **Success:** Tidak ada entri yang muncul di KB tanpa aksi user; setiap sesi tanya-jawab tentang tools diakhiri tawaran simpan yang bisa diabaikan tanpa mengganggu obrolan.

### CAP-2 — Entri 4 field
- **Intent:** Setiap entri terdiri dari: nama, fungsi (1–2 kalimat bahasa awam), kapan dipakai (situasi konkret), cara mulai (install/langkah pertama).
- **Success:** Setiap entri di KB memiliki keempat field terisi dan cukup bagi pemula untuk mulai memakai tools tanpa membuka sumber lain.

### CAP-3 — Recall hemat
- **Intent:** Sebelum pertanyaan user dikirim ke AI, jalankan pencarian lokal (FTS5) atas KB; bila kecocokan ketat, suntikkan entri ke prompt builder dengan instruksi "sebutkan bila relevan, jangan dipaksakan".
- **Success:** Pertanyaan yang cocok dengan entri tersimpan dijawab dengan menyebut entri itu; pertanyaan tanpa kecocokan diproses dengan nol panggilan AI tambahan dibanding perilaku saat ini.

### CAP-4 — Kelola via chat
- **Intent:** User melihat daftar, melihat isi, dan menghapus entri lewat perintah chat natural; hapus selalu membutuhkan konfirmasi ulang.
- **Success:** "tools apa aja yang gua simpan?" menampilkan seluruh entri dalam satu bubble; penghapusan entri tidak pernah terjadi tanpa aksi kedua yang eksplisit.

### CAP-5 — Satu KB bertipe extensible
- **Intent:** Semua entri hidup di satu tabel dengan kolom `tipe` (tool, library, layanan, konsep); menanyakan hal yang sudah tersimpan memperbarui entri lama, bukan menduplikasi.
- **Success:** Entri yang sama tidak pernah ganda; tipe baru (mis. commit, bug, keputusan) bisa ditambahkan tanpa migrasi skema.

## Constraints

- UI tetap WhatsApp native: semua interaksi (chips, list, konfirmasi, empty state) hidup di dalam ruang chat; dilarang menambah tab, halaman, atau layar baru. (flow: `chat-flows.md`)
- Efisiensi kuota: recall tidak boleh menambah panggilan LLM — pencarian hanya lokal (FTS5 di libSQL).
- Stack eksisting: Next.js 15 + React 19, libSQL (`@libsql/client`), provider layer Gemini yang sudah ada; dikerjakan di branch `Explore`.

## Non-goals

- Auto-save tanpa konfirmasi.
- Tab/halaman/layar UI baru; ekspor atau backup KB.
- Vector search / RAG / embedding (FTS lokal saja di fase ini).
- Fitur Project Partner (PRD generator, dokumentasi git, bug log, UI dual-account) — produk terpisah, jalur planning tersendiri.
- Multi-user / sharing antar pengguna.

## Success signal

Dalam percakapan baru, user bertanya "buat deploy itu pakai apa tadi?" — dan mesin menjawab dengan mengutip entri yang pernah dia simpan, tanpa panggilan AI ekstra; dan setiap entri di KB adalah hasil konfirmasi eksplisit user.

## Assumptions

- Aplikasi single-user lokal; tidak ada skenario multi-user pada fitur ini.

## Resolved decisions (post-review)

- Chip `Edit` = revisi via pesan chat berikutnya (mode revisi 1–2 giliran, lalu tawarkan simpan lagi); form inline ditolak — melanggar prinsip WhatsApp native.
- Ambang "kecocokan ketat" FTS: mulai ketat, longgarkan berdasarkan observasi setelah rilis; salah sebut lebih buruk daripada terlalu sunyi.

## Wrapper-only content

- Narasi persona forge (Yui, Dana, Grumbal, Boundary, Chyrel, Rara, Kinanti) — proses, bukan kontrak; tercatat di laporan forge.
