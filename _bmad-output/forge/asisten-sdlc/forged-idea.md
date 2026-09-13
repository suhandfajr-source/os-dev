# Forged Idea — Meja Kendali (Asisten SDLC)

> Hasil sesi forge `asisten-sdlc` · status: HARDENED

## Keputusan terkunci

- **Bentuk:** fitur di aplikasi Personal Vibe Coding Assistant yang sudah ada — bukan produk baru, bukan sekadar workflow manual.
- **Arsitektur:** satu backend, dua frontend berbeda — **WhatsApp mode** (kamus & simpan tools, ad hoc) dan **Dashboard mode** (meja kendali SDLC). Dapur sama (data, AI, knowledge base FTS), tampilan & fitur terpisah. User mengaktifkan salah satu.
- **Filsafat:** mesin = **ASISTEN, bukan eksekutor**. Tiga kerja universal di semua tahap: **Draft** (buatkan draf), **Record** (catat dokumentasi & keputusan), **Remind** (status tahap & apa yang harus dikerjakan). Eksekusi tetap di "meja kerja lain": user + coding agent + tool eksternal.
- **Struktur:** `Proyek` = entitas utama Dashboard. Halaman depan = daftar proyek; satu proyek = satu meja kendali.
- **Interaksi:** wizard/form terstruktur per tahap, AI bekerja di belakangnya sebagai generator/reviewer — bukan chat-driven.
- **Tahapan:** Planning → Design → Development → Testing → Deployment → Maintenance (urutan sesuai materi HaramainKU Sesi 2). **Bebas diakses tanpa kunci** — disiplin lewat asisten yang menjelaskan status (selesai/belum) dan sisa pekerjaan tiap tahap. "Disiplin dengan ruang fleksibilitas."
- **Penghubung ke eksekusi:** paket handoff (spec + kriteria selesai) siap dipakai coding agent.
- **Sinerji:** WhatsApp mode & Dashboard bertemu di Knowledge Base (FTS) yang sudah ada → loop pengalaman antar proyek.

## Urutan rilis

| Rilis | Isi | Alasan |
|---|---|---|
| R1 | Fondasi `Proyek` + mesin status + wizard **Planning** + fitur **Development** (story board, handoff, changelog) | Development makan stories dari Planning — pisah = setengah jalan |
| R2 | Wizard **Design** + **Testing** + **plan monitoring** (dari Maintenance) | Ringan & mandiri; plan monitoring tidak butuh riwayat dan kebutuhan nyata user |
| R3 | **Maintenance** penuh (catatan insiden, retrospective) | Makan riwayat dari tahap lain — didahulukan = form kosong |
| R4 | **Deployment** (checklist, config generator, deploy log) | Pelengkap |

## Ditolak & alasannya

- **Monitoring realtime ala Sentry dari dalam sistem** — bukan peran asisten; sistem tak punya akses ke server produksi. Penggantinya: rencana monitoring + catatan manual.
- **Tahap terkunci berurutan** — ditolak user; diganti disiplin advisory (status & sisa pekerjaan).
- **Chat-driven dashboard** — diganti wizard terstruktur + AI di belakangnya.
- **Model termahal untuk semua** (prinsip dari materi) — cocokkan model ke bobot tugas wizard.

## Sumber

Materi: `docs/HaramainKU_Week_2_Vibecoding.md` bagian 4–8 (Planning → Maintenance).
Memlog sesi: `_bmad-output/forge/asisten-sdlc/.memlog.md`.
