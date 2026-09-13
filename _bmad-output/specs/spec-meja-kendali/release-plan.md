# Release Plan — Meja Kendali

Urutan membangun fitur (bukan urutan tahapan SDLC — itu tetap Planning → Design → Development → Testing → Deployment → Maintenance). Urutan rilis mengikuti ketergantungan data antar fitur, bukan urutan pemakaian.

## R1 — Fondasi + loop inti

- Entitas `Proyek` + halaman daftar proyek (CAP-2)
- Status tahap **Planning & Development** dari artefak approved (CAP-4 — versi ringan; mesin 6 tahap penuh di R2)
- Wizard **Planning** (CAP-3): brief → draf PRD → spec + stories, semua review/approve
- Fitur **Development** (CAP-5, CAP-6): story board, paket handoff ke coding agent, changelog

Alasan: fitur Development makan stories dari Planning — dipisah berarti meja kendali "setengah jalan". R1 sengaja ramping: tanpa tier model ringan (semua tugas AI memakai `AI_MODEL`) dan tanpa mesin status penuh, agar loop inti cepat terbukti.

## R2 — Tahapan ringan + plan monitoring

- Wizard **Design**: deskripsi wireframe, diagram mermaid, catatan keputusan & trade-off
- Wizard **Testing**: test plan/checklist per story, log hasil test manual
- **Plan monitoring** (bagian dari Maintenance): apa yang dimonitor, tool apa, cara setup
- Mesin status 6 tahap penuh (CAP-4) + dual mode penuh (CAP-1): pindah mode tanpa kehilangan state
- Model AI dua tingkat: `AI_MODEL_LIGHT` untuk tugas ringan (infrastruktur untuk CAP-3)

Alasan: ringan dan mandiri; plan monitoring tidak butuh riwayat dan merupakan kebutuhan nyata user. Infrastruktur (status penuh, dual mode, tier ringan) menyusul setelah loop inti R1 terbukti dipakai.

## R3 — Maintenance penuh

- Catatan insiden & penanganan
- Retrospective per proyek
- Sinerji KB: pelajaran tersimpan ke knowledge base (FTS) untuk diingatkan saat planning proyek berikutnya

Alasan: makan riwayat dari tahap lain — didahulukan berarti form kosong.

## R4 — Deployment (pelengkap)

- Checklist pre-deploy
- Generator file konfigurasi CI/CD (yml)
- Deploy log: tanggal, versi, perubahan, rencana rollback

Alasan: paling ujung rantai, makan hasil testing.
