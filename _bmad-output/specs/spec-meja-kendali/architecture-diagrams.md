# Architecture Diagrams — Meja Kendali

## Dua frontend, satu dapur

```text
┌─────────────────────┐        ┌──────────────────────┐
│  FRONTEND WHATSAPP  │        │   FRONTEND DASHBOARD │
│  kamus & simpan     │        │   meja kendali SDLC  │
│  tools (ad hoc)     │        │   wizard per tahap   │
└──────────┬──────────┘        └──────────┬───────────┘
           │        ┌───────────┐         │
           └────────┤  BACKEND  ├─────────┘
                    │ AI + data │
                    │ + KB (FTS)│──→ paket handoff ──→ 🖥️ meja kerja lain
                    └───────────┘      (spec + AC)      (coding agent)
```

- **WhatsApp mode** — perekam cepat & kamus; fitur existing (kamus FTS, simpan tools) tetap utuh.
- **Dashboard mode** — kerja terstruktur per proyek per tahap; wizard dengan AI di belakangnya.
- **Backend tunggal** — data, AI client, dan knowledge base (FTS) dipakai bersama kedua mode; tidak ada duplikasi data.
- **Paket handoff** — keluaran Dashboard menuju coding agent; eksekusi terjadi di luar aplikasi.

## Alur wizard per tahap (CAP-3)

```text
User isi form/input  →  AI mendraf  →  User review & edit  →  Approve  →  Artefak tersimpan (CAP-5)
                                                ↑                                  │
                                                └── status tahap diperbarui (CAP-4)┘
```

Gerbang = persetujuan user, bukan kunci sistem: tahapan bebas diakses (CAP-7), status tetap dihitung dari artefak yang sudah disetujui.
