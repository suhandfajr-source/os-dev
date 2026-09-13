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

## Skema data inti (R1)

```text
project   : id, name, description, created_at, updated_at
artifact  : id, project_id → project, stage, type, status, content, created_at, updated_at
            stage  = planning | design | development | testing | deployment | maintenance
            type   = brief | prd | spec | story | handoff | ...
            status = draft | approved
story     : id, project_id → project, title, description, status, order, created_at, updated_at
changelog : id, project_id → project, note, created_at    (append-only)
```

- Status tahap **dihitung** (derived) dari `artifact.status = approved` per stage — tidak disimpan sebagai kolom terpisah, agar status selalu akurat (CAP-4, CAP-7).
- Di R1, status baru dihitung untuk stage Planning dan Development; mesin 6 tahap penuh tuntas di R2.
- Detail isi `content` per tipe artefak (struktur PRD, spec, dsb.) dirancang saat implementasi — skema inti di atas adalah kontrak minimum agar semua story R1 berpijak pada bentuk data yang sama.
