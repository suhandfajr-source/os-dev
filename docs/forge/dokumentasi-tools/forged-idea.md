# Forged Idea: Dokumentasi Tools

Fitur "dokumentasi tools" untuk Personal Vibe Coding Assistant: user menemukan tools baru → tanya mesin → mesin jelaskan → simpan (setelah konfirmasi) → kapan pun dibutuhkan, mesin menarik dari yang tersimpan.

## Keputusan (lock)

1. **Simpan hanya setelah konfirmasi.** Mesin menjelaskan dulu, lalu quick reply chips: `Simpan 📦 / Edit / Skip`. Bukan auto-save.
2. **Entri 4 field:** nama tools, fungsi (1–2 kalimat bahasa awam), kapan dipakai (situasi konkret), cara mulai (install/langkah pertama). Ditolak: tags, link resmi, tanggal+sumber jawaban — terlalu berat untuk digenerate dan direview.
3. **Recall hemat ("B versi hemat"):** FTS lokal (FTS5, libSQL) dijalankan sebelum panggilan AI; bila ada entri yang cocok (ambang ketat), suntikkan ke prompt builder dengan instruksi "sebutkan bila relevan, jangan dipaksakan". Tanpa kecocokan → nol biaya tambahan. Ditolak: recall pasif (KB jadi catatan yang tak pernah dibaca) dan recall via LLM per-pesan (2× panggilan model, boros kuota).
4. **UI tetap WhatsApp native.** Nol elemen baru di luar ruang chat: list entri = satu bubble bullet, konfirmasi = chips, kelola = chat-command natural.
5. **Kelola via chat:** "tools apa aja yang gua simpan?", "hapus X", "lihat entri Y". Hapus selalu konfirmasi ulang sebelum eksekusi.
6. **Satu knowledge base bertipe, extensible:** satu tabel libSQL dengan kolom `tipe` (`tool`, `library`, `layanan`, `konsep`; siap tambah `commit`, `bug`, `keputusan` untuk fase Project Partner). UI tetap terpisah (Kamus & Tools), satu mesin di belakangnya. Entri ganda → update, bukan duplikat.
7. **Urutan eksekusi:** Dokumentasi Tools dieksekusi dulu (epic kecil); fitur "Project Partner" (PRD generator, dokumentasi git, bug log, UI dual-account) = produk terpisah berukuran project-sized, digarap lewat jalur planning BMad penuh setelah detailing — tapi fondasi KB bertipe dari fitur ini langsung terpakai di sana.

## Titik lemah yang selamat dari ujian

- KB tumbuh lambat bila user jarang mengonfirmasi simpan (konsekuensi lock #1) — pantau.
- Mesin kadang bisa salah menyebut entri yang kurang relevan (lock #3) — mitigasi: ambang ketat + instruksi prompt.
- Empty state & ambiguitas perintah hapus (lock #5) — mitigasi: konfirmasi ulang + chips.

## Persona yang menguji

Yui 🎯 (Craftsman), Dana 🚢 (Pragmatist), Grumbal 😤 (Adversary), Boundary 🌶️ (Edge-Case Hunter), Chyrel 🤝 (Consensus Challenger), Rara 👩‍💻 (vibe coder pemula, suara luar), Kinanti 👩‍🎨 (desainer produk, suara luar).
