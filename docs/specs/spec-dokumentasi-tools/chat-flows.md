# Chat Flows — Dokumentasi Tools

Semua interaksi terjadi di dalam ruang chat yang sudah ada, bergaya WhatsApp native. Tidak ada layar baru.

## Flow simpan (chips)

1. User bertanya tentang sebuah tools/library/layanan/konsep (baru atau yang sudah pernah ditanyakan).
2. Mesin menjawab seperti biasa (persona & gaya yang sudah ada).
3. Di akhir jawaban muncul quick reply chips: `Simpan 📦` · `Edit` · `Skip`.
4. `Simpan 📦` → entri 4 field (nama, fungsi, kapan dipakai, cara mulai) disimpan ke KB; chat menampilkan konfirmasi singkat satu baris.
5. `Edit` → user menyebut perubahan via pesan berikutnya; mesin merevisi entri lalu menyimpan setelah persetujuan.
6. `Skip` → tidak menyimpan apa pun, obrolan berlanjut normal.

## Flow recall (hemat)

1. Sebelum prompt dikirim ke AI, jalankan FTS lokal (FTS5) atas KB memakai pertanyaan user.
2. Kecocokan ketat → entri disuntikkan ke prompt builder sebagai konteks: *"user punya catatan tersimpan: …"* plus instruksi *sebutkan bila relevan, jangan dipaksakan*.
3. Tanpa kecocokan → prompt dikirim seperti biasa, tanpa biaya tambahan apa pun.

## Flow kelola (chat-command natural)

| User berkata | Mesin |
|---|---|
| "tools apa aja yang gua simpan?" | Satu bubble berisi list entri (bullet, gaya forward message) |
| "lihat entri tmux" | Isi lengkap entri dalam satu bubble |
| "hapus tmux dari dokumentasi" | Konfirmasi ulang (chips `Hapus` / `Batal`) → hapus setelah aksi kedua |
| Perintah ambigu | Perlakukan sebagai obrolan biasa; jangan menebak untuk menghapus/mengubah data |

## Empty state

KB kosong → chat berjalan normal; jawaban atas "tools apa aja yang gua simpan?" adalah satu bubble singkat yang mengajak menyimpan entri pertama, tanpa layar atau onboarding khusus.
