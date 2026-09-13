# Review Story 3 — Wizard Planning (Brief → Draf PRD)

- **File sumber:** `_bmad-output/specs/spec-meja-kendali/stories/3-wizard-planning-brief-ke-draf-prd.md`
- **Tanggal:** 2026-09-13 (sesi party-mode + advanced elicitation)
- **Metode elicitation yang dijalankan:** Pre-mortem Analysis, Assumption Audit, Boundary & Edge Case Sweep, Reframe the Question, Second-Order Thinking
- **Status:** temuan & usulan perbaikan — *belum* diterapkan ke story; menunggu keputusan human.

---

## 1. Temuan Ronde Pembukaan (Party Round 1)

| # | Temuan | Penemu | Ringkasan |
|---|--------|--------|-----------|
| F1 | Brief tidak pernah bisa `approved` | Mary (📊) | Status planning hanya tersentuh oleh PRD; brief yang user tulis panjang tidak punya tempat terhormat di meja kendali — tidak tampil sebagai artefak tersendiri. |
| F2 | AC "PRD memuat setiap fitur brief" tidak terverifikasi | John (📋) | Tidak bisa diuji otomatis tanpa memanggil AI sungguhan (flaky, mahal). Tidak ada mekanisme yang membuat kesesuaian brief↔PRD bisa dicek manusia secara konkret. |
| F3 | Draft brief hilang saat user kembali | Sally (🎨) | Form brief tidak dipersist sebelum panggilan AI. User yang menulis setengah halaman lalu pergi kehilangan semuanya — kegagalan sunyi tanpa error. |
| F4 | Usulan fix F1+F3 murah | Winston (🏗️) | Simpan brief sebagai `artifact` type=`brief` status=`draft` *sebelum* AI dipanggil. Tanpa skema baru; menutup F1 (brief tampil sebagai artefak) dan F3 (tak ada yang hilang) sekaligus. Konsekuensi: matrix I/O harus menambahkan alur ini. |
| F5 | `approve` ulang ambigu | Amelia (💻) | "No-op aman 200" belum mendefinisikan apakah `updated_at` ikut ter-set ulang. Jika iya, `updated_at` berbohong tentang kapan konten terakhir berubah. |
| F6 | Kalimat AC ambigu | Amelia (💻) | "Chip tahap Planning … berubah `selesai` tanpa reload halaman daftar berikutnya" — dua pembacaan (tanpa reload halaman detail vs refresh saat kembali ke daftar), dua implementasi berbeda. |

---

## 2. Hasil Elicitation (Per Metode)

### 2.1 Pre-mortem Analysis — "Sudah 2 minggu, story 3 gagal"

Skenario kegagalan yang direkonstruksi mundur:

1. **JSON berpagar markdown.** AI membungkus JSON dalam ```json fences → `JSON.parse` gagal → 502 berulang; user mengira aplikasi rusak. *Pencegahan:* prompt minta JSON mentah; parser `parsePrdResponse` membersihkan fence sebelum parse; pesan error menjelaskan "draf AI tidak valid, coba lagi" — bukan error teknis mentah.
2. **Draf generik lolos approve.** AI menghasilkan PRD rapi tapi melewatkan satu fitur brief; user menyetujui tanpa sadar. *Pencegahan:* lihat fix #2 — bagian "Cakupan Fitur dari Brief" eksplisit di konten PRD sehingga pencocokan jadi pekerjaan mata, bukan ingatan.
3. **Brief sangat panjang memicu truncation.** Output JSON terpotong → parse gagal selalu. *Pencegahan:* validasi panjang maksimum brief (usulan: 8.000 karakter) → 400 dengan pesan jelas.
4. **Regenerate + approve balapan.** User menekan "Draf Ulang" lalu "Setujui" saat panggilan AI masih berjalan → menyetujui konten lama/stale. *Mitigasi:* disable tombol approve saat generate berjalan (single-user; cukup di UI).
5. **`AI_MODEL` tidak ter-set di environment** → 502 di semua draf. *Pencegahan:* jalur error 502 sudah ada; pastikan pesannya menunjuk penyebab (config), dan cek env di manual test.

### 2.2 Assumption Audit

| Asumsi | Keyakinan | Dampak | Perlakuan |
|--------|-----------|--------|-----------|
| A1. `AI_MODEL` valid & terkonfigurasi saat runtime | Sedang | Tinggi | Jalur 502 + pesan yang menunjuk konfigurasi; cek manual test "matikan API key". |
| A2. `responseMimeType: application/json` selalu menghasilkan JSON parseable | **Rendah** | Tinggi | **Stress-test terlemah:** harden `parsePrdResponse` (strip fence, tolak `prd_markdown` string kosong, tolak `open_questions` bukan array-of-string). |
| A3. Invariant "satu PRD per proyek" bertahan saat regenerate | Tinggi | Sedang | Fungsi DB `createArtifact` untuk PRD harus upsert terhadap draft existing, bukan insert baru — tulis eksplisit di task DB. |
| A4. User membaca & mengedit sebelum approve | Rendah | Tinggi | Mitigasi desain sudah ada: bagian "Pertanyaan Kritis" memaksa engagement; jangan ditambah mekanisme paksa (bukan filosofi CAP-7). |
| A5. Derivasi status planning hanya dari approve PRD | Tinggi | Sedang | Dokumentasikan eksplisit; tidak ada jalur lain yang menyentuh status planning (brief `draft` sengaja tidak ikut). |
| A6. Single-user, tanpa konkurensi nyata | Tinggi | Rendah | Diterima; cukup mitigasi UI (disable tombol). |

### 2.3 Boundary & Edge Case Sweep

Sudah tercakup di matrix: brief kosong/spasi → 400; project tidak ada → 404; AI gagal → 502 tanpa artifact. Yang **belum** tercakup:

| Kasus batas | Perilaku diusulkan |
|-------------|--------------------|
| PRD **sudah `approved`**, user minta draf baru | **409** — "PRD sudah disetujui" (pilihan paling aman; mencegah efek domino di §2.5-3). Alternatif: timpa dengan draft baru — butuh keputusan human. |
| Brief melebihi batas panjang (usulan 8.000 karakter) | 400 + pesan jelas. |
| PATCH `content` hanya whitespace | 400 (sama seperti kosong — tulis eksplisit). |
| AI mengembalikan `prd_markdown` string kosong atau `open_questions` bukan array | Dianggap JSON tidak valid → 502, tidak ada artifact tersimpan. |
| GET artifacts dengan `?stage=`/`?type=` tidak dikenal | Abaikan filter (kembalikan semua) — sederhana; atau 400. Pilih satu, tulis. |
| `projectId` bukan angka / tidak ada | 404. |
| User pindah halaman saat generate berjalan | Panggilan selesai di server, artifact tetap tersimpan — dapat diterima; UI cukup menangani abort navigasi. |

### 2.4 Reframe the Question

Pertanyaan yang dinyatakan: *"Bagaimana wizard mengubah brief menjadi draf PRD yang bisa disetujui?"*
Reframe: *"Bagaimana user mendapatkan PRD yang ia percayai — dan tahu persis apa yang belum ia jawab?"*

Implikasi: nilai inti story ini bukan sekadar artifact `prd` tersimpan, melainkan **daftar pertanyaan kritis** — itu bagian yang mengubah "draf generik yang bisa disetujui" menjadi "draf yang layak dipertanyakan". Konsekuensi konkret: pertanyaan kritis jangan tenggelam di dalam markdown PRD; di UI wizard ia layak ditampilkan sebagai blok tersendiri (sudah ada di task UI: "daftar pertanyaan kritis dari AI" — pertahankan dan jadikan penekanan visual, bukan catatan kaki). Framing ini tidak mengubah scope; ia mengubah prioritas penekanan implementasi.

### 2.5 Second-Order Thinking

1. **Brief sebagai artifact (fix F4)** → efek lanjutan: GET artifacts kini mengembalikan brief juga — itu *bagus* untuk CAP-5 (artefak tampil di meja kendali); pastikan UI detail proyek menampilkan brief sebagai artefak terpisah. CAP-6 handoff membaca artefak approved — brief `draft` otomatis terkecuali, konsisten.
2. **Regenerate menimpa, riwayat di story 5** → risiko diterima: user kehilangan draf lama yang ia sukai. Cukup sad-risk untuk single-user; jangan tambah versi di sini (scope creep). Catat sebagai keputusan yang sudah diambil di Design Notes.
3. **Regenerate setelah approve** → jika diizinkan menciptakan status zombie: PRD `approved` ditimpa konten draf baru, atau derivasi status ambigu ("approved tapi konten draft?"). **Kasus batas §2.3 baris pertama (409) menutup seluruh rantai ini** — itulah mengapa keputusan itu paling penting di antara semua edge case.
4. **Pola `updated_at` eksplisit** harus disalin ke *semua* fungsi DB baru (termasuk `updateArtifactContent` saat PATCH) — satu fungsi yang lupa = data status yang menyesatkan ke story 5 (changelog) dan CAP-4.

---

## 3. Usulan Perbaikan ke Story (Konsolidasi)

Urutan prioritas — #1 dan #2 mengubah *intent-kualitas*; sisanya mengisi celah kontrak.

1. **Persist brief sebelum AI** (F1+F3+F4): alur `draft-prd` menyimpan `artifact` type=`brief` status=`draft` lebih dulu, lalu memanggil AI. Kegagalan AI tidak menghapus brief. Matrix I/O + task DB + UI wizard diperbarui; brief ikut tampil di daftar artefak detail proyek.
2. **AC "memuat setiap fitur brief" jadi terverifikasi manusia** (F2): system prompt wajib memuat bagian `## Cakupan Fitur dari Brief` yang menaftar setiap fitur yang teridentifikasi dari brief. AC2 dirumuskan ulang: *reviewer dapat mencocokkan bagian itu dengan brief secara visual.* (Penilaian kualitas tetap manusia — bukan test AI-in-the-loop.)
3. **Keputusan regenerate-setelah-approve**: usulan 409, ditulis di matrix I/O (menutup efek domino §2.5-3).
4. **`approve` ulang**: 200, **tidak** mengubah `updated_at` (F5).
5. **Wording AC chip**: "chip tahap Planning di halaman daftar berubah `selesai` saat kembali/refresh halaman daftar" (F6).
6. **Batas panjang brief**: 8.000 karakter → 400.
7. **Parser hardening**: strip code fence; `prd_markdown` kosong atau `open_questions` tidak valid → 502 tanpa artifact.
8. **PATCH whitespace-only** → 400; **GET filter tak dikenal** → pilih abaikan/400 dan tulis.
9. **Mitigasi race UI**: disable tombol Setujui/Draf Ulang saat generate berjalan (catatan UI, bukan kontrak API).
10. **Upsert eksplisit**: task DB fungsi PRD memastikan satu PRD per proyek (update draft existing, bukan insert baru).

---

## 4. Yang Tidak Diubah (Setelah Debat)

- Bentuk wizard/form, bukan chat — CAP-3 sudah tegas.
- Tanpa riwayat versi (story 5) dan tanpa mekanisme "wajib jawab pertanyaan kritis sebelum approve" — melawan CAP-7 (akses bebas, disiplin advisory).
- Tanpa skema/kolom baru — kontrak `architecture-diagrams.md` cukup.
- Tanpa test otomatis yang memanggil AI sungguhan — flaky; kualitas draf dijaga lewat prompt + review manusia.
