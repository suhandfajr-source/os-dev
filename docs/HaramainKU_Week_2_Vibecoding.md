# Vibecoding — Utuh, dari Basic ke Advanced

> **HARAMAINKU × CONEXTLAB · Sesi 2 dari 8**  
> **Tema:** Dari Normal Vibecoder jadi Wise Builder  
> **Durasi:** 4 jam  
> **Peserta:** Vibecoder non-IT yang sudah mulai membangun · Tim Transformer  
> **Fasilitator:** Samuel Jason Santosa

> **Catatan konversi:** Dokumen ini dirapikan dari materi PDF 66 halaman. Struktur visual seperti kartu, kolom, timeline, dan diagram disederhanakan menjadi heading, tabel, daftar, dan alur Markdown tanpa mengubah isi pokok materi.

---

## Daftar Isi

- [Sambungan dari Sesi 1](#sambungan-dari-sesi-1)
- [Bagian 1 — Apa Itu Vibecoding](#bagian-1--apa-itu-vibecoding)
- [Bagian 2 — Vibecoding: Aliran Baru, Banyak Penyimpangan](#bagian-2--vibecoding-aliran-baru-banyak-penyimpangan)
- [Bagian 3 — Fundamental IT](#bagian-3--fundamental-it)
- [Bagian 4 — Planning](#bagian-4--planning)
- [Bagian 5 — Design](#bagian-5--design)
- [Bagian 6 — Development: Vibecoding](#bagian-6--development-vibecoding)
- [Bagian 7 — Deployment](#bagian-7--deployment)
- [Bagian 8 — Maintenance](#bagian-8--maintenance)
- [Penutup — Future of Vibecoding](#penutup--future-of-vibecoding)

---

<!-- Halaman 2 -->
## Sambungan dari Sesi 1

### Sesi 1 kita pasang fondasi cara berpikir

| Topik | Ringkasan |
|---|---|
| **Fundamental AI** | AI ⊃ ML ⊃ DL ⊃ LLM · token, context, temperature · chatbot → agentic → RAG. |
| **Fundamental IT** | SDLC, peran tim, dokumentasi (PRD/ERD), inisiasi IT yang terukur. |
| **5 Pertanyaan Orang IT** | Lifecycle · biaya · pengguna · metrik · keberlanjutan (bus factor). |

> **Sesi 2:** Kita turun lebih dalam ke akar — komputer, pemrograman, web — lalu bedah vibecoding dari basic sampai advanced.

---

# Bagian 1 — Apa Itu Vibecoding

<!-- Halaman 4 -->
## Asal-usulnya: satu tweet Andrej Karpathy, Feb 2025

**Andrej Karpathy** — `@karpathy`  
co-founder OpenAI · ex-Director of AI, Tesla

> “There's a new kind of coding I call vibe coding, where you fully give in to the vibes, embrace exponentials, and forget that the code even exists… I 'Accept All' always, I don't read the diffs anymore. When I get error messages I just copy paste them in with no comment… It's not too bad for throwaway weekend projects. I just see stuff, say stuff, run stuff, and copy paste stuff, and it mostly works.”

> **Perhatikan:** Dia sendiri menyebutnya untuk “throwaway weekend projects” — bukan untuk sistem yang dipakai jamaah dan santri.

<!-- Halaman 5 -->
## “Bahasa pemrograman terpanas hari ini = Bahasa Inggris”

| Generasi | Penjelasan |
|---|---|
| **Software 1.0** | Manusia menulis instruksi eksplisit. Kode ditulis baris per baris. |
| **Software 2.0** | Bukan kode — bobot neural network yang “dilatih” dari data. |
| **Software 3.0** | Prompt bahasa natural jadi program. LLM = komputer jenis baru. |

> **Artinya:** Vibecoding itu Software 3.0 dipakai sembarangan. Bahasa Inggris jadi antarmuka — tapi tetap butuh yang paham apa yang dibangun.

<!-- Halaman 6 -->
## Jadi sebenarnya apa itu vibecoding?

Analoginya: kamu bangun rumah tanpa ngerti caranya, full serahin ke kontraktor, kamu cuma tahu bayar.

> “Saya nggak ngerti pondasi, nggak ngerti struktur, nggak ngerti listrik. Saya cuma bilang mau rumah 2 lantai, terus transfer.”

### Kontraktornya = AI

Dia yang mikir, dia yang ngerjain, dia yang nentuin material — kamu cuma lihat hasilnya.

### Kamu = yang bayar

Kamu nanggung biaya, nanggung risiko, nanggung kalau ada yang salah. Tapi kamu buta prosesnya.

> **Pertanyaannya:** Kalau kamu nggak tahu standar sama sekali, gimana kamu tahu kontraktornya kerja bener atau nggak?

<!-- Halaman 7 -->
## 2 kemungkinan hasil: Amaze atau Asem

| **Amaze** | **Asem** |
|---|---|
| Sekali prompt, langsung jadi — rasanya sihir | Budget ngalir terus, proyek nggak kelar-kelar |
| Fitur yang dulu butuh tim, sekarang semalam | Hasil nggak sesuai ekspektasi |
| Momentum tinggi, semangat meledak | Prosesnya muter-muter, bongkar-pasang tanpa arah |
|  | …dan banyak drama “asem” lain |

> **Bedanya di mana?** Bukan di AI-nya. Di orang yang pegang kemudi — ngasal, atau tahu apa yang dia lakukan.

<!-- Halaman 8 -->
## Karpathy sendiri, ~1 tahun kemudian: “agentic engineering”

> “Coding lewat LLM agents makin jadi workflow default para profesional — tapi dengan lebih banyak pengawasan dan scrutiny. Ambil leverage-nya, tanpa kompromi kualitas software.”

| Vibe coding (2025) | Agentic engineering (2026) |
|---|---|
| Pengawasan rendah, terima semua diff, buat proyek buang. | Pakai agent, tapi ada spec, review, quality gate. Ini yang kita tuju. |

> **Target sesi ini:** Bukan berhenti pakai AI — tapi naik kelas dari vibe coding jadi engineering.

---

# Bagian 2 — Vibecoding: Aliran Baru, Banyak Penyimpangan

Sudah kayak aliran kontemporer — terlalu banyak miskonsepsi. Yuk bedah dua yang paling umum.

<!-- Halaman 10 -->
## Miskonsepsi #1 — “Nggak perlu ngerti ngoding. Biar full AI aja.”

> “Makin sini AI makin pintar — prompt-prompt aja langsung jadi aplikasi. Udahlah, kita nggak perlu programmer.”

**Kurang tepat.**

### Bos harus tahu standar > tukang

Supervisor yang gampang dibodohi pegawainya = bukan supervisor. Kamu harus bisa menilai hasil.

### AI itu pegawai, bukan tuan

Jangan treat AI sebagai bos kamu. Semua mau punya pegawai AI — sedikit yang paham cara ngendaliinnya.

> Bukan berarti harus jago ngoding mendalam. Tapi paham end-to-end programming — bahkan product development — di level fundamental.

<!-- Halaman 11 -->
## Kenapa kamu tetap harus paham end-to-end

Bukan biar bisa ngetik kode — biar bisa mengarahkan, menilai, dan ngambil keputusan.

- **Deteksi ngawur** — Tahu kapan AI bikin sesuatu yang salah / berlebihan.
- **Kasih arah** — Bisa bilang “pakai pendekatan X, bukan Y” — bukan cuma “tolong benerin”.
- **Nilai trade-off** — Cepat vs murah vs aman — kamu yang putuskan, bukan AI.
- **Jaga yang penting** — Data user, biaya, keamanan — hal yang AI nggak peduli.

> **Ingat Sesi 1:** Kalian sekarang IT manager tanpa sadar. Manager nggak harus jadi tukang — tapi wajib paham pekerjaannya.

<!-- Halaman 12 -->
## Miskonsepsi #2 — “Vibecoding jangan pakai model murah.”

> “Pakai model terbaru & termahal biar hasilnya nggak slop. Prompt singkat aja, biar mereka yang mikirin — nanti jadi kayak yang orang-orang buat di internet.”

**Salah total.**

Vibecoding yang baik bukan soal model terbaik, terbaru, termahal.

> Nggak semua gedung perlu lantai marmer 1 miliar. Lobby kantor? Oke. Sampai ke WC-nya juga? Nggak juga. Perlu Senior Analyst Deloitte ngecek proyek sampai detail terkecil? Nggak.

<!-- Halaman 13 -->
## Ada hierarki: cost-to-performance & speed-to-performance

| Bobot tugas | Contoh | Model |
|---|---|---|
| **Tugas ringan** | Ubah teks, styling, komponen sederhana | Model cepat & murah cukup |
| **Tugas menengah** | Logika bisnis, integrasi, refactor | Model mid-tier |
| **Tugas berat** | Arsitektur, debugging kompleks, keputusan besar | Model paling pintar |

> **Wise Builder:** Cocokkan model ke bobot tugas. Bukan pakai model termahal buat semua, lalu kaget lihat tagihan.

<!-- Halaman 14 -->
## Contoh nyata: Fable 5.1 vs GLM-5.3-Flash

Model flagship termahal vs model “flash” murah. Harga per 1 juta token (Sep 2026).

|  | Claude Fable 5.1 | GLM-5.3-Flash |
|---|---:|---:|
| Posisi | premium flagship | model cepat & murah |
| Input | $10 | $0,15 |
| Output | $50 | $0,50 |
| Context | ±200K–1M | 1M token |

> **Selisihnya:** ±67× lebih mahal di input, 100× di output. Untuk 80% tugas vibecoding, yang murah sudah lebih dari cukup.

<!-- Halaman 15 -->
## Vibecoding nggak seindah yang dijual influencer

Hari ini kita bedah yang baik & benar — dan cara transform dari Normal Vibecoder → Wise Builder.

| Normal Vibecoder | Wise Builder |
|---|---|
| “Full serahin ke AI” | Tahu kapan sendiri, kapan bareng AI |
| Asik ngeprompt kayak punya mainan baru | Punya info, pengalaman, keputusan bijak |
| Sering nggak selesai | Beneran menyelesaikan sesuatu |

> **Wise Builder = orang bijak + builder.** Bijak soal pembagian kerja, builder karena beneran membangun sampai jadi.

<!-- Halaman 16 -->
## Apa itu Wise Builder?

- **Tahu pembagian kerja** — Kapan buat sendiri, kapan kerja bareng AI, mana tugas AI, mana tugas kamu.
- **Punya bekal** — Informasi + pengalaman — bukan cuma nekat prompt dan berharap.
- **Keputusan bijak** — Menimbang biaya, risiko, waktu — sadar konsekuensi tiap pilihan.
- **Menyelesaikan** — Membangun sesuatu sampai selesai & dipakai — bukan berhenti di demo.

> **Sisa sesi ini:** Kita bangun bekal itu — dari akar komputer sampai framework vibecoding paling advanced.

---

# Bagian 3 — Fundamental IT

Kemarin dasar IT & product development. Sekarang lebih dalam — akar dari segalanya.

<!-- Halaman 18 -->
## Sejarah komputer — kenapa harus tahu

Programming nggak akan ada kalau nggak ada komputer. Pahami akarnya dulu.

| Tahun | Tonggak | Ringkasan |
|---|---|---|
| **1837** | Analytical Engine | Charles Babbage rancang mesin hitung ber-program. Ada Lovelace tulis “algoritma” pertama. |
| **1936** | Mesin Turing | Alan Turing definisikan apa itu “komputasi” secara matematis. |
| **1945** | ENIAC | Komputer elektronik general-purpose pertama. Seukuran ruangan. |
| **1947–58** | Transistor & IC | Tabung → transistor → integrated circuit. Komputer mengecil & murah. |
| **1971→** | Microprocessor → PC → HP | Intel 4004, Altair, IBM PC 1981, smartphone. Komputer di saku semua orang. |

> **Intinya:** Semua “aplikasi” hari ini cuma instruksi yang jalan di atas mesin yang sama sejak 1945: proses angka, simpan, ulang.

<!-- Halaman 19 -->
## Sejarah pemrograman — lahirnya bahasa

| Tahun | Tonggak | Ringkasan |
|---|---|---|
| **1843** | Algoritma pertama | Ada Lovelace — instruksi untuk Analytical Engine. |
| **1940-an** | Machine code | 0 dan 1 langsung. Manusia colok kabel & saklar. |
| **1950-an** | Assembly | Singkatan (`MOV`, `ADD`) — masih sangat dekat mesin. |
| **1957** | FORTRAN | John Backus/IBM. Bahasa tingkat-tinggi pertama — untuk sains. |
| **1959–64** | COBOL & BASIC | COBOL (Grace Hopper) untuk bisnis. BASIC (Dartmouth) untuk orang awam. |
| **1972** | C | Dennis Ritchie/Bell Labs. Fondasi hampir semua bahasa modern. |

> **Polanya:** Tiap generasi menaikkan level abstraksi — makin jauh dari mesin, makin dekat ke bahasa manusia. Vibecoding = langkah terbaru pola ini.

<!-- Halaman 20 -->
## Hardware · Firmware · OS · Program

Empat lapisan yang bikin sebuah program bisa jalan. Dari bawah ke atas.

1. **Program / Aplikasi** — Yang kamu (dan AI) tulis. WhatsApp, sistem pesantren, dll.
2. **Operating System** — Windows / macOS / Linux / Android. Jembatan program ↔ hardware.
3. **Firmware (BIOS/UEFI)** — Kode kecil di chip. Menyalakan & menyiapkan hardware saat booting.
4. **Hardware** — CPU, RAM, Storage, layar. Besi yang beneran mengeksekusi.

> Saat kamu klik ikon: Program minta OS, OS perintah hardware, hardware jalankan. Semua lewat empat lapis ini.

<!-- Halaman 21 -->
## Di balik layar saat program jalan

Koordinasi tiga komponen — analoginya seperti orang masak di dapur.

| Komponen | Analogi | Fungsi |
|---|---|---|
| **Storage** | Lemari | Simpan permanen. Lambat diakses. Semua file & program “diam” di sini. |
| **RAM** | Meja kerja | Tempat kerja sementara. Cepat, tapi hilang kalau mati. Program aktif ditaruh di sini. |
| **CPU** | Si juru masak | Yang beneran mengeksekusi instruksi, satu per satu, miliaran kali per detik. |

> **Kenapa penting:** Kebutuhan RAM & CPU inilah yang nanti kamu hitung waktu Planning — biar server nggak kekecilan atau kemahalan.

<!-- Halaman 22 -->
## Dari ngoding sampai jadi aplikasi

Apa yang terjadi antara “kamu menulis kode” dan “user membuka app”.

**Alur:**

`Source code` → `Compiler / Interpreter` → `Executable / Bundle` → `Deploy ke server` → `User buka aplikasi`

- **Compiler** menerjemahkan seluruh kode ke bahasa mesin sekali di depan (C, Go).
- **Interpreter** menerjemahkan baris per baris saat jalan (Python, JS).
- Runner / build tool yang mengurus langkah tengah otomatis. `npm run build`, `docker build` — itu proses ini.

<!-- Halaman 23 -->
## Bahasa lama → lahirnya web

| Tahun | Teknologi | Ringkasan |
|---|---|---|
| **1959→** | COBOL | Sistem perbankan & pemerintah. Sebagian masih jalan sampai hari ini. |
| **1991** | Visual Basic | Microsoft. Drag-drop bikin aplikasi Windows — “low-code” pertama. |
| **1990-an** | Delphi / Pascal | Aplikasi desktop cepat. Banyak software toko/kasir zaman itu. |
| **1991** | World Wide Web | Tim Berners-Lee. HTML + browser. Awalnya cuma dokumen. |
| **1995→** | Web jadi platform | JavaScript & PHP lahir. Web berubah dari dokumen jadi aplikasi. |

> **Titik balik:** Begitu web bisa menjalankan aplikasi — tanpa install, update sekali untuk semua — arah industri berubah selamanya.

<!-- Halaman 24 -->
## Kenapa web app akhirnya menguasai

Pasar SaaS berbasis web tembus ±$408 miliar (2025). Mayoritas aplikasi bisnis hari ini lahir sebagai web.

- **Tanpa install** — Cukup buka link. Jalan di HP, laptop, tablet — sistem operasi apa pun.
- **Update sekali** — Perbaiki di server, semua user langsung dapat versi baru. Nggak ada “update dulu”.
- **Kolaborasi & akses** — Data terpusat, banyak orang akses bareng, kontrol dari satu tempat.
- **Murah didistribusi** — Nggak perlu App Store, nggak perlu approval, nggak per-platform.

> **Buat kalian:** Sistem pesantren & travel Umrah = web app. Makanya sisa sesi fokus ke stack web.

<!-- Halaman 25 -->
## Workflow pemrograman — tulang punggung sesi ini

`Planning` → `Design` → `Development` → `Testing` → `Deployment` → `Maintenance`

Vibecoding yang asem biasanya karena lompat langsung ke Development — Planning & Design dilewati, Testing & Maintenance nggak dipikirin.

> Sisa slide kita bahas satu per satu — Planning, Design, Development, Deployment, Maintenance — versi vibecoding yang bijak.

---

# Bagian 4 — Planning

Sebelum satu baris kode ditulis: mau bahasa apa, struktur gimana, stack apa, hardware perlu apa.

<!-- Halaman 27 -->
## Yang harus diputuskan di Planning

- **Bahasa & runtime** — Web modern → JavaScript / TypeScript. Untuk mayoritas kasus kalian, ini jawabannya.
- **Arsitektur & struktur** — Monolith atau service-based? Folder & modul ditata gimana?
- **Tech stack** — Kombinasi framework, database, ORM, hosting — dipilih sadar, bukan ikut hype.
- **Hardware / infra** — CPU, RAM, storage — dihitung dari jumlah user & beban, bukan ditebak.

> **Wise Builder:** Keputusan ini dibuat di depan, bareng AI sebagai penasihat — bukan dibiarkan “kejadian” di tengah jalan.

<!-- Halaman 28 -->
## Struktur website: HTML · CSS · JS

Tiga bahasa dasar yang jalan di setiap browser. Analoginya: rumah.

| Teknologi | Analogi | Fungsi |
|---|---|---|
| **HTML** | Rangka | Struktur & isi halaman: judul, paragraf, tombol, form. Kerangka rumah. |
| **CSS** | Cat & tata ruang | Warna, font, layout, jarak, animasi. Bikin rumah enak dilihat & dihuni. |
| **JavaScript** | Listrik | Interaktivitas: klik, ketik, ambil data, update tampilan tanpa reload. |

> Semua framework modern React, Next, Vue — pada akhirnya tetap menghasilkan HTML + CSS + JS yang dijalankan browser.

<!-- Halaman 29 -->
## Lalu lahir server-side: PHP + Database

HTML/CSS/JS jalan di browser (client). Tapi data harus disimpan & diproses di suatu tempat aman — server.

**Alur:**

`Browser` → kirim request → `Server (PHP)` → proses logika → `Database` → simpan / ambil data → `Server` → balikin HTML jadi

PHP + MySQL menguasai web 2000-an (WordPress, Facebook awal). Polanya masih sama sampai sekarang — cuma bahasanya berganti.

> **Kata kunci:** Client = yang dilihat user. Server = yang menyimpan kebenaran. Database = tempat data hidup.

<!-- Halaman 30 -->
## Web modern: JavaScript jadi bahasa nomor 1

| Tahun | Peristiwa | Ringkasan |
|---|---|---|
| **1995** | JS lahir | Dibuat 10 hari oleh Brendan Eich. Cuma buat animasi kecil di browser. |
| **2009** | Node.js | JavaScript bisa jalan di luar browser — jadi bahasa server juga. |
| **2013** | React | Facebook. Cara baru bangun UI — komponen. Jadi standar industri. |
| **Sekarang** | Satu bahasa, ujung ke ujung | Frontend + backend + tooling semua JS/TS. Belajar 1, pakai di mana-mana. |

> **Untuk kalian:** Cukup fokus satu ekosistem — JavaScript/TypeScript — dari tampilan sampai server. Lebih sedikit yang harus dipelajari.

<!-- Halaman 31 -->
## Node.js & React — dua pilar stack modern

### Node.js

Runtime yang menjalankan JavaScript di server. Menangani request, akses database, logika bisnis, API.

### React

Library untuk membangun tampilan dari “komponen” yang bisa dipakai ulang. Tombol, kartu, form — sekali buat, pakai berkali-kali.

> Di atas keduanya tumbuh framework yang menyatukan semuanya jadi satu paket rapi — kita lihat di slide berikutnya.

<!-- Halaman 32 -->
## Tech stack modern — kombinasi yang umum

- **Frontend** — React + TypeScript, TanStack (routing/query), styling Tailwind.
- **Meta-framework** — Next.js — React + routing + server rendering jadi satu. Paling umum dipakai.
- **Backend** — Node.js — via Next.js API, atau terpisah pakai Nest.js untuk API besar.
- **ORM** — Prisma / Drizzle — “penerjemah” antara kode & database. Nulis query pakai bahasa kode, bukan SQL mentah.

> **ORM = Object-Relational Mapping.** Kamu tulis `user.findMany()`, ORM ubah jadi SQL. Aman dari typo & serangan injeksi.

<!-- Halaman 33 -->
## Database: Relational vs Non-Relational

| Relational (SQL) | Non-Relational (NoSQL) |
|---|---|
| Data dalam tabel dengan kolom & relasi tetap. | Data fleksibel — dokumen, key-value. |
| Contoh: Postgres, MySQL. | Contoh: MongoDB, Firestore. |
| Cocok untuk data terstruktur & saling terhubung — jamaah, paket, pembayaran. | Cocok untuk data yang bentuknya berubah-ubah / sangat besar & sederhana. |

> **Aturan praktis:** Ragu? Pilih relational (Postgres). Mayoritas aplikasi bisnis butuh data yang saling terhubung & konsisten.

<!-- Halaman 34 -->
## Database juga dibagi by fungsi

- **Database utama** — Postgres — sumber kebenaran. Semua data penting hidup di sini.
- **Cache (Redis)** — Simpan sementara di memori. Super cepat. Untuk data yang sering dibaca & jarang berubah.
- **Analytics / Big Data (BigQuery)** — Untuk analisa jutaan-miliaran baris. Bukan untuk operasional harian — untuk laporan & insight.
- **Search (Elastic / Meilisearch)** — Khusus pencarian teks cepat & relevan. Cari nama jamaah, dokumen, produk.

> **Proyek kecil-menengah:** Cukup Postgres. Tambah Redis kalau sudah kerasa lambat. Sisanya nanti, kalau memang perlu.

<!-- Halaman 35 -->
## Kenapa Postgres paling direkomendasikan

- **Andal & matang** — 30+ tahun, dipakai bank & korporasi. Jarang bikin kejutan.
- **Serba bisa** — Relational + JSON + full-text search + geospatial. Satu database, banyak kebutuhan.
- **Gratis & di mana-mana** — Open source. Didukung semua hosting (Supabase, Neon, Railway, RDS).

> **Rekomendasi default:** Mulai dengan Postgres. Baru pindah / tambah teknologi lain kalau ada alasan nyata — bukan karena penasaran.

<!-- Halaman 36 -->
## Monolith vs Service-Based

Monolith = satu aplikasi besar utuh. Microservices = banyak aplikasi kecil yang saling bicara.

| Monolith — 1 kotak | Microservices — banyak kotak |
|---|---|
| Semua fitur dalam satu codebase, satu deploy. | Tiap bagian berdiri sendiri, tim & skala terpisah. |
| Lebih sederhana, cepat dibangun, mudah dipahami. | Kuat untuk sistem besar & kompleks — tapi ongkos kerumitannya tinggi. |
| Cocok 90% proyek — termasuk kalian. | Cocok saat memang sudah punya masalah skala yang nyata. |

> **Jangan microservices untuk proyek kecil.** Itu menyelesaikan masalah skala yang belum kamu punya, sambil menambah masalah baru hari ini.

<!-- Halaman 37 -->
## Menghitung kebutuhan hardware

Bukan ditebak. Dihitung dari beban per stack × jumlah user bersamaan (konkurensi).

- **CPU** — Berapa request/detik? Tiap request makan berapa ms CPU? → jumlah core.
- **RAM** — Memori dasar app + (memori per koneksi × user bersamaan) + cache + database.
- **Storage** — Ukuran database sekarang + laju pertumbuhan/bulan + file upload + backup.
- **Konkurensi** — Bukan total user. User yang aktif di detik yang sama. Biasanya 1–10% dari total.

> **Cara aman:** Mulai kecil + monitoring. Naikkan saat data bilang perlu — jangan beli server 100-core “buat jaga-jaga”.

<!-- Halaman 38 -->
## Non-negotiable sebelum proyek serius

> **JANGAN DITAWAR**

- **Git** — Riwayat setiap perubahan. Bisa balik ke versi mana pun. Ini jaring pengaman #1.
- **CI/CD yang benar** — Tiap perubahan otomatis dites & di-deploy. Bukan upload file manual ke server.
- **Arsitektur database** — Skema dirancang, ada migrasi, ada relasi. Bukan tabel dadakan seenaknya.
- **Access & role security** — Siapa boleh lihat/ubah apa. Guard di setiap pintu. Data jamaah itu tanggung jawab hukum.
- **Server setup & deployment** — Lingkungan produksi & dev terpisah. Proses deploy terdokumentasi.
- **Backup & rollback** — Backup terjadwal, pernah dites restore. Rencana balik cepat kalau deploy gagal.

> **Kalau salah satu belum ada:** Proyeknya belum siap dipakai orang lain. Ini bukan “nice to have”.

---

# Bagian 5 — Design

Sebelum bangun: rancang tampilan, alur, arsitektur, dan aliran data.

<!-- Halaman 40 -->
## Empat hal yang perlu di-design

- **Tampilan (Prototyping)** — Wireframe / mockup tiap layar. Kelihatan sebelum dibangun = hemat bongkar-pasang.
- **Alur (Activity Diagram)** — Langkah demi langkah tiap proses: pendaftaran, pelunasan, keberangkatan.
- **Tech Architecture** — Kotak & panah: apa ngobrol ke apa, di mana data, di mana panggilan AI.
- **Data Flow & Analysis** — Data apa yang dikumpulkan, mengalir ke mana, dipakai untuk keputusan apa — pikirkan dari awal.

> **Kenapa data dari awal:** Menambahkan analitik & “big data” belakangan itu mahal. Rancang strukturnya sekarang, walau belum dipakai.

<!-- Halaman 41 -->
## Prototyping cepat dengan pen.dev

Design tool AI-native yang hidup di dalam editor kode kamu.

- **Kanvas di dalam editor** — Gambar UI di ruang design tak terbatas, tepat di sebelah kode.
- **File `.pen` ikut Git** — Design disimpan sebagai file JSON di proyek. Bisa di-branch, diff, merge, rollback — sama seperti kode.
- **Terhubung ke AI (MCP)** — Agent bisa baca & ubah design, lalu generate kode React + TS + Tailwind yang persis.
- **Loop dua arah** — Design → kode → impor komponen balik ke kanvas. Design token sinkron.

> **Buat vibecoder:** Kamu bisa “gambar” maunya dulu, baru minta AI bangun — hasilnya jauh lebih terarah daripada prompt teks doang.

<!-- Halaman 42 -->
## Alternatif manual: Figma

Standar industri untuk design UI. Terpisah dari kode — tapi ekosistemnya paling lengkap.

- **Design di kanvas** — Frame per layar, komponen, auto-layout, prototype yang bisa diklik.
- **Kolaborasi real-time** — Banyak orang edit bareng, komentar langsung di design. Bagus untuk review tim.
- **Ke kode** — Plugin & MCP untuk ekstrak style ke kode, atau AI baca design lalu bangun.

> **Pilih mana:** pen.dev kalau mau design & kode nyatu di satu alur. Figma kalau butuh kolaborasi design tim & library besar.

---

# Bagian 6 — Development: Vibecoding

**From One AI Assistant to Multiple Agentic AI**

<!-- Halaman 44 -->
## Apa itu AI Agent — dan kenapa penting buat membangun

- **Bukan cuma jawab** — Chatbot: tanya-jawab. Agent: menalar → pakai tool → lihat hasil → ulang, sampai tugas selesai.
- **Punya tangan** — Baca/tulis file, jalankan terminal, cari di web, jalankan test, buka browser — beneran bekerja di proyek.
- **Kerja berlangkah** — “Bangun fitur login” → bikin file, tulis kode, jalankan, perbaiki error, ulangi — tanpa dituntun tiap langkah.

> **Untuk membangun app:** Agent yang bikin vibecoding terasa “sihir” — tapi juga yang bikin biaya & risiko meledak kalau tanpa kendali.

<!-- Halaman 45 -->
## CLI vs IDE vs ADE

| Bentuk | Penjelasan |
|---|---|
| **CLI agent** | Agent di terminal (Claude Code, OpenCode, Codex). Ringan, scriptable, kuat. Butuh sedikit nyaman dengan terminal. |
| **AI IDE** | Editor + AI (Cursor, Windsurf). Manusia tetap di tengah — baca, tulis, debug kode. AI membantu di dalam editor. |
| **ADE** | Agentic Dev Environment. Kamu kasih tugas & spec, banyak agent kerja paralel di lingkungan terisah, kamu review hasilnya. |

> **Kenapa ADE menang:** IDE dibuat untuk manusia mengetik kode. ADE dibuat untuk mengorkestrasi agent — sesuai cara kerja sekarang.

<!-- Halaman 46 -->
## AI Spawn — AI memanggil AI lain

Satu agent utama bisa membuat sub-agent untuk tugas spesifik, lalu menggabungkan hasilnya.

**Contoh alur:**

`Agent Utama` → `Riset` · `Tulis fitur` · `Review & test`

> **Manfaatnya:** Tiap sub-agent fokus & context-nya bersih. Hasil lebih rapi daripada satu agent ngerjain semua sekaligus.

<!-- Halaman 47 -->
## AI Steering — satu file markdown mengubah segalanya

Kamu nggak perlu ulang-ulang jelaskan konteks. Tulis sekali, agent baca tiap kali.

| Tanpa steering | Dengan steering |
|---|---|
| Tiap sesi mulai nol. Agent nggak tahu konvensi, stack, aturan — kamu jelasin lagi & lagi. | Agent tahu: pakai helper X, jangan Y, stack-nya ini, testnya begini. Konsisten tiap kali. |

> **Analoginya:** SOP untuk pegawai baru. Kamu nggak mau training dari nol tiap orang masuk — kamu kasih dokumen, mereka ikut.

> **Ini bukan fitur kecil:** Steering file yang bagus = beda antara agent yang membantu dan agent yang bikin berantakan.

<!-- Halaman 48 -->
## File steering: `CLAUDE.md` · `AGENTS.md` · `specs.md` · `designs.md`

### `CLAUDE.md` / `AGENTS.md`

Aturan proyek: stack, konvensi, perintah build/test, yang boleh & tak boleh. Agent baca otomatis tiap sesi.

### `specs.md`

Spesifikasi fitur: apa yang dibangun, untuk siapa, kriteria selesai. Sebelum kode ditulis.

### `designs.md`

Keputusan design & arsitektur: kenapa pilih pendekatan ini, bukan itu.

### Cara bikin

Mulai kecil (10 baris), tambah tiap kali agent salah paham. Minta AI bantu nyusunnya.

> **Kenapa ini yang paling penting:** Model bisa ganti, harga bisa turun — tapi konteks & aturan proyek kamu yang bikin hasilnya bagus konsisten.

<!-- Halaman 49 -->
## Spec-Driven Development

Menulis spesifikasi yang jelas dulu — baru AI generate kode. Mengubah seluruh workflow vibecoding.

**Alur:**

1. **Tulis spec** — apa & kriteria selesai.
2. **Review spec** — bareng AI & manusia.
3. **AI generate** — kode dari spec.
4. **Verifikasi** — kode vs spec.

> Ingat game algoritma roti Sesi 1? Spec yang jelas = resep yang nggak bisa disalahartikan. AI isi celah asumsi dengan tebakan — spec menutup celah itu.

> **Rekomendasi:** Untuk fitur apa pun yang lebih besar dari perubahan kecil — tulis spec dulu. Ini bagian dari SDLC, bukan tambahan.

<!-- Halaman 50 -->
## Cara memilih model AI

Empat hal yang dicek — bukan cuma “yang paling baru”.

- **Usage / beban** — Berapa panggilan per hari? Tugas berat atau ringan? Tentukan tier yang masuk akal.
- **Pricing** — Harga input + output per juta token. Hitung ke rupiah/bulan di volume kamu.
- **Context window** — Cukup untuk file + riwayat yang perlu “dilihat” model sekaligus?
- **Benchmark / AI index** — Skor coding (SWE-bench, dll) & Artificial Analysis Index. Bandingkan apple-to-apple.

> **Contoh keputusan:** Fable 5.1 ($10/$50) untuk arsitektur & bug sulit · GLM-5.3-Flash ($0,15/$0,50) untuk 80% tugas harian.

<!-- Halaman 51 -->
## Mau lebih advanced & ikut SDLC? BMAD Method

**Breakthrough Method for Agile AI-Driven Development.** Open source, gratis.  
`github.com/bmad-code-org/BMAD-METHOD`

Alih-alih satu agent umum yang ngerjain semua — BMAD menjalankan “tim agile” dari agent-agent spesialis, masing-masing dengan peran & persona sendiri, yang saling mengecek pekerjaan.

- **Semua terdokumentasi** — PRD, arsitektur, story — dibuat & divalidasi sebelum satu baris kode.
- **Berulang & konsisten** — Proses jadi “assembly line” yang bisa diprediksi & diulang.
- **Kontrol lebih** — Vibe coding jadi software siap-produksi, bukan proyek buang.

<!-- Halaman 52 -->
## BMAD: tim agent yang mirip tim agile

| Agent | Peran |
|---|---|
| **Analyst** | Riset & bikin project brief. |
| **Product Manager** | Ubah brief jadi PRD. |
| **Architect** | Rancang arsitektur dari PRD. |
| **Product Owner** | Validasi & pecah jadi story. |
| **Scrum Master** | Atur alur, siapkan story untuk dev. |
| **Developer** | Implementasi story satu per satu. |
| **QA** | Uji, cari bug, jaga kualitas. |
| **Orchestrator** | Koordinasi semua agent di atas. |

> **Kenapa banyak agent:** Tiap persona fokus & context-nya bersih. Saling cek = lebih sedikit yang lolos jadi bug.

<!-- Halaman 53 -->
## BMAD workflow & command

Contoh: `greenfield-fullstack` (proyek baru dari nol).

`Analyst → project brief` → `PM → PRD` → `Architect → arsitektur` → `SM → story siap` → `Dev + QA → implementasi`

**Command** — tiap agent dipanggil eksplisit di editor/CLI:

`*analyst` → `*pm` → `*architect` → `*sm` → `*dev`

Tiap output jadi input agent berikutnya.

> **Kapan pakai BMAD:** Proyek yang cukup besar & serius. Untuk perbaikan kecil, overkill — cukup spec + satu agent.

<!-- Halaman 54 -->
## Harnessing — lebih penting dari sekadar model

Harness = “kerangka” di sekeliling model: cara dia baca kode, pakai tool, ingat konteks, ambil keputusan.

> Model yang sama bisa dapat skor sangat berbeda di harness yang berbeda. Makanya: **“berhenti milih model, mulai milih harness.”**

- **Context management** — Apa yang dikasih ke model, kapan, seberapa relevan.
- **Tool & eksekusi** — Kualitas tool: baca file, jalankan test, cari, feedback error.
- **Loop & recovery** — Cara agent menalar, mencoba, sadar salah, dan memperbaiki.

<!-- Halaman 55 -->
## Contoh: OpenCode + Claude bisa mengungguli Claude di Claude Code

### OpenCode

Harness open-source (MIT), eks-tim SST / Anomaly. 170rb+ bintang GitHub. Primary agent & sub-agent kustom, MCP, `AGENTS.md`, LSP, skills.

### Poinnya

Model = mesin. Harness = mobil. Mesin Ferrari di sasis rusak tetap kalah dari mesin biasa di mobil yang dirancang bagus.

> **Wise Builder:** Investasi waktu di harness & steering file = ROI lebih besar daripada terus ganti ke model termahal.

---

# Bagian 7 — Deployment

Nggak kalah penting dari membangun. Kode yang bagus tapi nggak sampai ke user = nol.

<!-- Halaman 57 -->
## Apa itu Deployment & DevOps

### Deployment

Proses memindahkan kode dari laptop kamu ke server yang bisa diakses user — dengan aman, terulang, dan bisa dibatalkan.

### DevOps

Budaya & praktik menyatukan Development + Operations: otomasi, monitoring, deploy sering & kecil, tanggung jawab bersama.

> **Prinsip:** Deploy harus membosankan. Kalau tiap deploy bikin deg-degan, ada yang salah dengan prosesnya.

<!-- Halaman 58 -->
## CI/CD dengan GitHub Actions

Tiap kali kamu push kode, pipeline otomatis jalan sebelum sampai ke user.

**Pipeline:**

`Push ke GitHub` → `CI: jalankan test & lint` → `Build bundle` → `CD: deploy ke server` → `Health check & monitoring`

> Kalau test gagal → deploy berhenti otomatis, kode lama tetap jalan. Ini jaring pengaman yang bikin kamu berani deploy 10× sehari.

> **Minimal setup:** 1 file `.github/workflows/deploy.yml` — minta AI bikinin, lalu kamu pahami tiap langkahnya.

---

# Bagian 8 — Maintenance

Setelah live, pekerjaan belum selesai. Bagaimana kita tahu sistem sehat?

<!-- Halaman 60 -->
## Cara memonitor website setelah live

Tiga pertanyaan yang harus selalu bisa kamu jawab.

| Pertanyaan | Yang dicari | Tool |
|---|---|---|
| **Apa yang error?** | Ada crash? Di halaman mana, untuk user siapa, baris kode mana? | Sentry |
| **Apa yang dilakukan user?** | Fitur mana dipakai, di mana user berhenti, kenapa nggak konversi? | PostHog |
| **Apakah sistemnya sehat?** | Response time, uptime, biaya AI/bulan, kapasitas server. | Dashboard |

> **Tanpa monitoring:** Kamu tahu ada masalah dari komplain user — bukan dari sistem. Itu terlambat.

<!-- Halaman 61 -->
## Intro Sentry — kesehatan aplikasi

Alat reaktif: mencegah produk jadi lebih buruk. “Baris mana yang rusak, untuk user mana.”

- **Error tracking** — Tiap crash tercatat dengan stack trace lengkap — 100+ bahasa. Tahu persis di mana.
- **Performance tracing** — Request lambat? Breakdown per langkah — database, API, render. Ketahuan bottleneck-nya.
- **Session replay** — Rekaman apa yang user lakukan sebelum & saat error terjadi.
- **Alerting** — Notifikasi ke Slack/email saat error baru muncul atau lonjakan. Tahu sebelum user komplain.

> **Untuk siapa:** Wajib kalau ada sistem yang beneran dipakai. Setup ±15 menit — tinggal pasang SDK.

<!-- Halaman 62 -->
## Intro PostHog — perjalanan user

Alat proaktif: bikin produk jadi lebih baik. Melihat user journey, bukan cuma error.

- **Product analytics** — Fitur mana dipakai, seberapa sering, oleh siapa. Data untuk keputusan produk.
- **Funnels & retention** — Di langkah mana user berhenti (misal: daftar → bayar → berangkat). Berapa yang balik lagi.
- **Session replay** — Tonton rekaman sesi user asli — lihat kebingungan mereka langsung.
- **Feature flags & A/B test** — Nyalakan fitur untuk sebagian user, ukur dampaknya, baru rilis ke semua.

> **Sentry + PostHog:** Sentry jaga sistem jangan memburuk. PostHog dorong produk jadi lebih baik. Keduanya, bukan salah satu.

---

# Penutup — Future of Vibecoding

<!-- Halaman 64 -->
## Satu orang kendalikan Planning → Maintenance

Vibecoding membuat ini mungkin. Tapi jujur — ini melelahkan kalau dikerjakan manual terus.

`Planning` → `Design` → `Dev` → `Deploy` → `Maintenance`

Kamu jadi PM, arsitek, developer, DevOps, dan support — sekaligus. Awalnya seru. Lama-lama jadi beban yang nggak sustainable.

> **Jawabannya:** Bangun automation. Agent yang monitoring, agent yang triase error, pipeline yang deploy sendiri. Kamu naik ke level “mengarahkan”, bukan “mengerjakan”.

<!-- Halaman 65 -->
## Hari ini: dari Normal Vibecoder ke Wise Builder

- **Paham pembagian kerja** — Tahu mana tugas kamu, mana tugas AI, kapan buat sendiri.
- **Punya bekal fundamental** — Komputer, pemrograman, web, stack, database — cukup untuk mengarahkan.
- **Kerja dengan spec & steering** — Spec dulu, `CLAUDE.md`, BMAD kalau perlu — bukan prompt ngasal.
- **Pikirkan lifecycle penuh** — Planning sampai Maintenance. Deploy & monitoring bagian dari “selesai”.

> **Wise Builder bukan yang paling jago ngoding — tapi yang paling bijak memutuskan, dan beneran menyelesaikan.**

---

## Terima kasih

**Bangun dengan bijak.**

Sesi 2 dari 8 · Vibecoding, utuh dari basic ke advanced · HaramainKU × Conextlab

Samuel Jason Santosa · CTO Conextlab · “Teman kamu bertumbuh di Era AI.”
