---
id: SPEC-meja-kendali
companions:
  - release-plan.md
  - stage-scope.md
  - architecture-diagrams.md
sources:
  - _bmad-output/forge/asisten-sdlc/forged-idea.md
---

> **Kontrak kanonik.** SPEC ini dan file di `companions:` adalah kontrak lengkap untuk membangun, menguji, dan memvalidasi. Sumber di frontmatter hanya untuk traceability.

# Meja Kendali — Asisten SDLC

## Why

Vibecoder non-IT (pemilik aplikasi ini) sudah punya asisten AI percakapan (WhatsApp mode) tapi tidak punya tempat terstruktur untuk menjalani lifecycle SDLC — Planning sampai Maintenance — sesuai materi HaramainKU Sesi 2. Tanpa itu, proyek berjalan dari prompt ngasal: artefak tidak tersimpan, status tidak terlihat, dokumentasi hilang. Ini gabungan *pain to solve* dan *opportunity*: sistem sudah punya AI client, database, dan knowledge base — yang kurang hanyalah ruang kerja terstruktur per proyek.

## Capabilities

- **CAP-1**
  - **intent:** User dapat beralih antara dua mode tampilan — WhatsApp mode dan Dashboard mode — yang dilayani satu backend sama, untuk memisahkan pekerjaan ad hoc dari pekerjaan SDLC terstruktur.
  - **success:** Pindah mode tidak kehilangan state; data yang dibuat di satu mode terbaca di mode lain.
- **CAP-2**
  - **intent:** User dapat membuat dan mengelola proyek sebagai entitas utama Dashboard — satu proyek = satu meja kendali berisi wizard tahapannya.
  - **success:** Halaman depan Dashboard menampilkan daftar proyek; proyek baru yang dibuat langsung punya meja kendali yang bisa dibuka.
- **CAP-3**
  - **intent:** User dapat menyelesaikan tahapan SDLC lewat wizard/form terstruktur di mana AI mendraf konten di belakangnya dan user me-review, mengedit, lalu menyetujui.
  - **success:** Wizard Planning mengubah input brief menjadi draf PRD yang bisa diedit dan disetujui user (bukan chat-driven). Kualitas draf dijaga: PRD hasil draf minimal mencakup seluruh fitur yang disebut dalam brief plus daftar pertanyaan kritis yang belum dijawab user — bukan draf generik yang sekadar "bisa disetujui".
- **CAP-4**
  - **intent:** User dapat melihat status tiap tahapan proyek — selesai/belum — dan daftar konkret apa yang belum dikerjakan, dari asisten.
  - **success:** Tiap proyek menampilkan status 6 tahap beserta sisa pekerjaan yang spesifik dan bisa diverifikasi. *(Deliverable penuh 6 tahap selesai di R2; di R1 status mencakup tahap Planning dan Development.)*
- **CAP-5**
  - **intent:** User dapat menyimpan artefak dan keputusan yang telah disetujui per proyek per tahap, sebagai dokumentasi yang hidup.
  - **success:** Artefak yang di-approve tersimpan, tampil di meja kendali, dan bisa dibuka kembali apa adanya.
- **CAP-6**
  - **intent:** User dapat menghasilkan paket handoff (spec + kriteria selesai) dari sebuah story untuk ditempel ke coding agent di luar aplikasi.
  - **success:** Paket handoff berisi spec + acceptance criteria tergenerate dari story yang disetujui dan siap disalin utuh.
- **CAP-7**
  - **intent:** User dapat mengakses tahapan mana pun kapan saja tanpa kunci berurutan — disiplin tetap hadir lewat status advisory (CAP-4), bukan paksaan sistem.
  - **success:** Tahap mana pun bisa dibuka langsung dari meja kendali, dan status tiap tahap tetap akurat.

## Constraints

- Mesin **tidak pernah eksekusi**: tidak ada deploy otomatis, integrasi monitoring realtime, atau eksekusi kode di dalam sistem — hanya draft/record/remind.
- Urutan tahap di UI tetap Planning → Design → Development → Testing → Deployment → Maintenance (materi HaramainKU Sesi 2), meski akses bebas.
- Fitur WhatsApp mode existing (kamus FTS, simpan tools) wajib tetap berfungsi — Dashboard dibangun di sampingnya, bukan menggantikan.
- Bangun di stack existing: Next.js + SQLite/libSQL + Gemini client; tanpa infrastruktur baru di R1.
- Pemilihan model AI dua tingkat via env, tetap Gemini (tanpa provider baru): `AI_MODEL`=`gemini-3.6-flash` untuk tugas berat (draf PRD, pecah stories, kritik), `AI_MODEL_LIGHT`=`gemini-3.5-flash-lite` untuk tugas ringan (ringkasan, checklist, status); fallback chain & retry existing dipertahankan per tingkat. Tier ringan hadir mulai R2; di R1 semua tugas AI memakai `AI_MODEL`.

## Non-goals

- Tidak ada monitoring realtime ala Sentry/PostHog dari dalam sistem.
- Tidak ada eksekusi deploy/CI.
- Tidak ada generate/kompilasi kode di dalam aplikasi.
- Tidak ada multi-user/role system (personal tool).

## Success signal

- User menjalankan satu proyek nyata end-to-end dari meja kendali: brief → spec/stories disetujui → paket handoff ditempel ke coding agent → hasil dicatat kembali — tanpa keluar dari Dashboard untuk artefak planning.

## Assumptions

- Personal tool single-user, tanpa auth/role system.
- Skema data inti (`project`, `artifact`, `story`, `changelog`) ditetapkan di `architecture-diagrams.md`; detail per artefak (brief/PRD/story/log) tetap dirancang saat implementasi.
- Dual mode penuh (CAP-1: pindah mode tanpa kehilangan state) ditargetkan R2; di R1 Dashboard mode berjalan berdampingan dengan WhatsApp mode tanpa jaminan sinkronisasi state.
- R1 fokus backend: Dashboard mode sementara mengikuti pola UI yang sudah ada di aplikasi; jalur UX khusus (`bmad-ux`) ditunda, bukan dibatalkan.

