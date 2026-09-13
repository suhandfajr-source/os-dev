# Analisis & Rekomendasi Perbaikan — Story 3: Wizard Planning (Brief → draf PRD)

> Sumber: hasil review 3 lens (Adversarial, Edge-Case Hunter, Verification Gap) atas diff implementasi Story 3.
> Tanggal review: berdasarkan working tree pada baseline `37c9526`.
> Status story saat review: `in-review`, semua task `[x]`, verifikasi hanya smoke-test manual.

---

## 1. Ringkasan Eksekutif

Implementasi Story 3 secara arsitektur sudah mengikuti spec dengan baik: urutan persist-brief-dulu, guard 409, upsert satu-artifact-per-tipe, `updated_at` eksplisit, dan hardening parser. Namun review menemukan **dua kelas masalah utama**:

1. **Nol verifikasi otomatis** — tidak ada satu pun test yang menyentuh 4 route baru, 7 fungsi DB baru, atau parser PRD. Klaim `npx playwright test` lulus sebagai "tanpa regresi" adalah sinyal palsu: suite hijau penuh meski seluruh API wizard dihapus.
2. **Dua varian status-zombie masih terbuka di level API** — justru kelas bug yang never-constraint story coba tutup dengan guard 409:
   - **TOCTOU:** approve dari permintaan lain di antara cek 409 dan simpan PRD (AI call berdetik-detik) → PRD approved tertimpa dan direset `draft`.
   - **PATCH tanpa guard status:** konten PRD `approved` bisa diubah via API, status tetap `approved`, planning tetap `selesai`.

Prioritas perbaikan diurutkan di Section 3 (P0 = perbaiki sebelum approve story).

---

## 2. Temuan Lengkap (per lens)

### 2.1 Verification Gap (4 temuan — semua `patch`)

| # | Gap | Lokasi | Inti |
|---|-----|--------|------|
| VG-1 | Guard 409 regenerate-setelah-approve tidak teruji | `draft-prd/route.ts:39-45` | Guard bisa dibalik tanpa satu pun test merah |
| VG-2 | Kontrak "brief tersimpan dulu, AI gagal → 502, PRD tidak tersimpan" tidak teruji | `draft-prd/route.ts:58-80` | Reorder persist → kegagalan AI menghilangkan tulisan user, tak terdeteksi |
| VG-3 | Invariant "approve ulang tidak mengubah `updated_at`" tidak teruji | `db/index.ts:770-780` | Hapus cabang no-op → suite tetap hijau |
| VG-4 | Verification path yang dikutip story tidak mengobservasi perilaku story 3 | Section Verification story | `tsc` + `playwright test` = sinyal palsu bagi triage/walkthrough |

Bukti: pencarian symbol/import (`draft-prd`, `/approve`, `/artifacts`, `approveArtifact`, `parsePrdResponse`, `upsert*`) di seluruh `tests/` → **nol hasil**. Suite berjalan (`playwright.config.ts`, testDir `./tests`) hanya berisi 17 test story 1–2; test derivasi status story-2 me-seed artifact langsung ke DB, bukan lewat endpoint baru.

### 2.2 Edge-Case Hunter (6 unhandled paths)

| # | Lokasi | Kondisi | Konsekuensi |
|---|--------|---------|-------------|
| EC-1 | `artifacts/route.ts:19-24` | Filter `?stage=`/`?type=` tak dikenal lolos cast masuk SQL WHERE | `?stage=bogus` → array kosong; spec: "filter tak dikenal diabaikan (kembalikan semua)" |
| EC-2 | `draft-prd/route.ts:39` ↔ `db/index.ts:715-719` | TOCTOU: approve di antara cek 409 dan upsert PRD | PRD approved tertimpa + reset `draft` = zombie |
| EC-3 | `artifacts/[id]/route.ts:26-37` | PATCH tanpa guard status | Konten approved berubah via API, status/planning tetap "approved/selesai" |
| EC-4 | `approve/route.ts:12-21` | Approve menerima `type='brief'`; `deriveStageStatus` type-agnostic | Brief di-approve → planning `selesai`, kontradiksi Design Notes |
| EC-5 | `prd-prompt.ts:55-58` | `open_questions` mixed non-string disaring diam-diam (spec: tolak 502) | Blok "(Tidak ada — semua asumsi kunci tertutup)" tertulis palsu |
| EC-6 | `dashboard/[projectId]/page.tsx:33-44` | Fetch project gagal non-404 tak ditangani | Header "Memuat…" selamanya tanpa indikasi error |

### 2.3 Adversarial (10 temuan; yang bertumpuk dengan lens lain ditandai)

| # | Lokasi | Temuan |
|---|--------|--------|
| AD-1 | `artifacts/route.ts:19-24` | ⚠️ = EC-1. Implementasi filter bertentangan dengan spec story sendiri |
| AD-2 | `provider.ts:4-7,68` | Fallback chain diam-diam turun ke model **lite** saat rate-limit — kualitas "tier berat AI_MODEL" untuk draf PRD tidak terjaga tanpa jejak |
| AD-3 | `page.tsx:236-241` | Setelah PRD approved, tidak ada jalur persist perubahan brief (Draf Ulang terkunci) — editan brief hilang saat reload |
| AD-4 | `page.tsx:152` ↔ `prd-prompt.ts:76-77` | Magic string heading + placeholder pertanyaan kritis diduplikasi dua file; satu sisi berubah → blok UI hilang senyap |
| AD-5 | `draft-prd/route.ts:74-81` | Regex error `/API key|AI_MODEL|quota|API/i` terlalu luas — "API" match hampir semua error → petunjuk debug menyesatkan |
| AD-6 | `artifacts/[id]/route.ts:33-36` | Urutan cek: content kosong pada id tak ada → 400, bukan 404 seperti I/O Matrix |
| AD-7 | `db/index.ts:683-711` | Parameter `crypto.randomUUID()` diabaikan pada jalur update — API menyesatkan |
| AD-8 | `page.tsx:45-62` | Kegagalan load artifacts hanya `console.error` — user mengira proyek kosong dan menimpa brief dari nol |
| AD-9 | `page.tsx:33-44` | ⚠️ = EC-6 |
| AD-10 | `draft-prd/route.ts:39` | ⚠️ = EC-2 |

---

## 3. Rekomendasi Perbaikan (terurut prioritas)

### P0 — Perbaiki sebelum story di-approve

**R1. Kunci upsert PRD terhadap status approved (tutup TOCTOU) — EC-2 / AD-10**
Ubah UPDATE di `upsertPrdArtifact` menjadi kondisional, dan deteksi kegagalan di route:

```ts
// db/index.ts — upsertPrdArtifact, jalur update
const res = await client.execute({
  sql: `UPDATE artifact SET content = ?, status = 'draft',
        updated_at = strftime('%Y-%m-%d %H:%M:%f','now')
        WHERE id = ? AND status != 'approved'`,
  args: [content, existing.id],
});
if (res.rowsAffected === 0) return null; // approved di antara cek dan simpan
```

```ts
// draft-prd/route.ts — setelah memanggil upsertPrdArtifact
const prdArtifact = await upsertPrdArtifact(projectId, composePrdContent(parsed), crypto.randomUUID());
if (!prdArtifact) {
  return NextResponse.json({ error: 'PRD sudah disetujui. Tidak bisa membuat draf baru.' }, { status: 409 });
}
```

Ini menjadikan gerbang 409 **atomik di SQL**, bukan sekadar cek-then-act. *Usaha: kecil. Risiko ditutup: zombie varian 1.*

**R2. Guard status di PATCH artifact — EC-3**
Di `PATCH /api/artifacts/[id]`, setelah `getArtifactById`:

```ts
if (existing.status === 'approved') {
  return NextResponse.json({ error: 'PRD sudah disetujui — konten terkunci.' }, { status: 409 });
}
```

(Sesuaikan I/O Matrix story: tambahkan baris "Edit PRD approved → 409".) *Zombie varian 2 tertutup.*

**R3. Tambahkan test API untuk endpoint wizard — VG-1..VG-4**
Tiga test pertama sudah menutup pintu paling risiko; letakkan di `tests/api/artifacts.spec.ts` mengikuti pola `projects-status.spec.ts` (seed via DB langsung / endpoint proyek, cleanup via DELETE):

1. **409 guard:** seed PRD `approved` → `POST /api/projects/[id]/draft-prd` → expect 409 + konten artifact approved tidak berubah. *(VG-1)*
2. **502 brief-persisted:** jalankan dengan env tanpa `AI_API_KEY` (test ini perlu webServer env tanpa key, atau mock provider) → expect 502, GET artifacts: brief ada, artifact `prd` absen. *(VG-2)*
3. **Approve-ulang:** approve dua kali → expect 200 dan `updated_at` identik. *(VG-3)*
4. **PATCH approved → 409** (menjaga R2). *(EC-3)*
5. **Filter tak dikenal → semua** (menjaga R5). *(EC-1)*

Perhatian isolation: config playwright sudah set `DB_PATH` test terisolasi — test AI-failure harus memakai DB yang sama; untuk memicu 502 tanpa API key asli, opsi paling murah: set header/body khusus test TIDAK diperlukan — cukup jalankan dengan `AI_API_KEY` kosong di worker env, atau injeksi provider palsu via env `AI_PROVIDER=mock` bila mau menambah seam kecil di `getAIProvider`. Jangan mock di level fetch. *VG-4 ikut tertutup: verification path yang dikutip story akhirnya benar-benar mengcover perubahan.*

**R4. Tolak approve untuk artifact `brief` — EC-4**
Di route approve (atau di `approveArtifact`), sebelum update:

```ts
if (existing.type === 'brief') {
  return NextResponse.json({ error: 'Brief tidak disetujui — hanya PRD yang disetujui.' }, { status: 409 });
}
```

Alternatif lebih dalam: filter `type='prd'` di `deriveStageStatus` — tapi menolak di route lebih eksplisit dan selaras Design Notes. Update I/O Matrix & Design Notes sesuai keputusan.

### P1 — Perbaikan kontrak & ketahanan (sebaiknya ikut, boleh defer dengan catatan di Spec Change Log)

**R5. Samakan filter GET dengan spec: "tak dikenal diabaikan" — EC-1 / AD-1**
Validasi sebelum dipakai:

```ts
const ALL_STAGES: ArtifactStage[] = ['planning','design','development','testing','deployment','maintenance'];
const ALL_TYPES: ArtifactType[] = ['brief','prd','spec','story','handoff','design','test-plan','deploy-checklist','retro'];
const stage = ALL_STAGES.includes(stageParam as ArtifactStage) ? stageParam as ArtifactStage : undefined;
const type  = ALL_TYPES.includes(typeParam as ArtifactType) ? typeParam as ArtifactType : undefined;
```

Ekspor `ALL_STAGES`/`ALL_TYPES` dari `src/types/index.ts` agar satu sumber kebenaran. *Tanpa ini, AC "filter tak dikenal diabaikan" gagal bila diuji.*

**R6. Perketat parser sesuai spec: tolak `open_questions` non-string — EC-5**

```ts
if (obj.open_questions.some((q) => typeof q !== 'string')) {
  throw new Error('Draf AI tidak valid (pertanyaan kritis bukan teks). Silakan coba lagi.');
}
```

Baru setelah itu filter string kosong.

**R7. Satu sumber heading & placeholder pertanyaan kritis — AD-4**
Di `prd-prompt.ts`:

```ts
export const QUESTIONS_HEADING = '## Pertanyaan Kritis Belum Terjawab';
export const QUESTIONS_EMPTY = '(Tidak ada — semua asumsi kunci sudah tertutup oleh brief.)';
```

Pakai di `composePrdContent` **dan** di `extractQuestions` (`page.tsx:152`) — regex dibangun dari konstanta. Menghilangkan kelas bug "prompt berubah, UI hilang senyap".

**R8. Pertajam deteksi error AI — AD-5**
Ikuti pola chat route (cek status 429 + kata kunci spesifik):

```ts
const message = err instanceof Error && /API key|AI_MODEL|quota|resource_exhausted|429/i.test(err.message)
  ? 'Gagal menghubungi AI — periksa konfigurasi AI_API_KEY / AI_MODEL di environment.'
  : 'Gagal membuat draf PRD dari AI. Silakan coba lagi.';
```

Hapus kata generik `API` dari pola.

**R9. Error state untuk loadProject/loadArtifacts — EC-6 / AD-8, AD-9**
Di `page.tsx`, saat `!res.ok` atau fetch throw: set `error` yang sudah ada ("Gagal memuat proyek/arteffak") alih-alih diam. Perubahan kecil, memakai mekanisme UI yang sudah ada.

**R10. Jadikan brief tetap bisa disimpan setelah PRD approved — AD-3**
Opsi termurah tanpa endpoint baru: izinkan jalur **brief-only** di `draft-prd` — mis. body `{ brief, skipAi: true }` → hanya upsert brief, 200 tanpa AI. Atau izinkan PATCH pada artifact `brief` (R2 hanya mengunci PRD approved). Pilih satu, catat di Design Notes. Tanpa ini, editan brief user setelah approve hilang.

### P2 — Hygiene (boleh jadi defer)

**R11. Bersihkan API `upsert*` — AD-7:** parameter `id` hanya terpakai pada INSERT; jadikan opsional atau generate di dalam fungsi, dokumentasikan.
**R12. Samakan urutan cek PATCH dengan I/O Matrix — AD-6:** cek keberadaan id (404) sebelum validasi content (400), atau perbarui I/O Matrix.
**R13. (Opsional) Jejak fallback model — AD-2:** untuk draft-prd, pertimbangkan membatasi `candidateModels` ke model primer saja atau minimal `console.warn` saat fallback terjadi, agar klaim "tier berat" bisa diaudit. Perubahan di provider berpotensi menyentuh never-constraint ("jangan ubah provider") — jika dilarang, catat sebagai sad-risk di Design Notes dan jangan ubah kode.

---

## 4. Urutan Eksekusi yang Disarankan

1. **R1 + R2 + R4** (perbaikan API kecil, satu commit) → langsung diikuti **R5 + R6 + R7** (kontrak & parser).
2. **R3** (test API) ditulis setelah perbaikan, memverifikasi semuanya sekaligus.
3. **R8 + R9 + R10** (UX & pesan error).
4. **R11–R13** sesuai sisa waktu; yang tidak dikerjakan masuk Spec Change Log / Review Triage Log story dengan disposition `defer`.

Perbarui di dokumen story setelah selesai:
- **I/O Matrix:** baris baru "Edit PRD approved → 409" dan "Filter tak dikenal → semua (dengan validasi union)".
- **Verification:** ganti klaim verifikasi dengan test API baru yang benar-benar menjalankan endpoint wizard.
- **Design Notes:** keputusan R4 (tolak approve brief) dan R10 (jalur simpan brief setelah approve).

---

## 5. Yang Sudah Baik (dipertahankan)

- Urutan persist brief → AI → PRD sesuai approach; kegagalan parse tidak meninggalkan PRD setengah jadi.
- Guard 409 di level route sudah benar arah (hanya kurang atomik — lihat R1).
- Disiplin `updated_at` eksplisit + no-op approve-ulang sudah konsisten di semua path tulis.
- `parsePrdResponse` strip-fence + validasi field minimal sudah ada; R6 hanya mengetatkan sesuai spec.
- Tombol UI disabled saat `generating` mitigasi race yang wajar untuk tool personal single-user.
- Struktur `prd-prompt.ts` terpusat (prompt + parser + composer) memudahkan R7.

---

*File ini dibuat dari hasil review lens BMad; temuan per lens lengkapnya ada di percakapan review. Triage dipersilakan memindahkan item ke Review Triage Log story 3 dengan disposition `patch`/`defer` per baris Section 3.*
