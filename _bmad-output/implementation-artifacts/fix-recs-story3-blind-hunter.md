# Rekomendasi Perbaikan — Story 3 "Wizard Planning — Brief ke draf PRD"

> Sumber: hasil review multi-lensa (`review-story3-blind-hunter.md`) terhadap diff story 3.
> Dikelompokkan berdasarkan urutan pengerjaan yang disarankan, bukan severity.
> Setiap item: masalah → perbaikan konkret → lokasi file.

---

## Grup A — Lubang kontrak API (tutup dulu)

### A1. Approve harus menolak artifact type `brief`

**Masalah:** `POST /api/artifacts/[id]/approve` menyetujui artifact type apa pun.
Brief yang di-approve mematahkan invariant A5 ("brief selalu draft", terdokumentasi di
Design Notes) dan bisa membuat tahap Planning jadi `selesai` tanpa PRD pernah ada.

**Perbaikan** — `src/app/api/artifacts/[id]/approve/route.ts`, setelah `approveArtifact`… lebih baik di dalam fungsi DB agar semua pemanggil terlindungi:

```ts
// src/lib/db/index.ts — approveArtifact
if (existing.type === 'brief') {
  return null; // atau throw error khusus; route mengubahnya menjadi 409
}
```

```ts
// src/app/api/artifacts/[id]/approve/route.ts
const artifact = await approveArtifact(id);
if (!artifact) {
  return NextResponse.json(
    { error: 'Artefak tidak ditemukan atau tidak dapat disetujui (brief tidak pernah di-approve).' },
    { status: 404 }
  );
}
```

Alternatif yang lebih eksplisit (disarankan): guard di route dengan error 409 terpisah
agar pesan tidak tertukar dengan 404 "tidak ditemukan":

```ts
const existing = await getArtifactById(id);
if (!existing) return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
if (existing.type === 'brief') {
  return NextResponse.json({ error: 'Brief tidak dapat disetujui — hanya PRD.' }, { status: 409 });
}
```

**Ubah juga story doc:** baris I/O Matrix "Approve" tambahkan
`approve type=brief → 409`.

---

### A2. PATCH harus menolak edit pada artifact `approved`

**Masalah:** `PATCH /api/artifacts/[id]` menerima konten baru untuk PRD yang sudah
`approved`. Ini membuka kembali rantai zombie "approved tapi konten berubah" — justru
efek yang mau ditutup dengan 409 regenerate. UI menandai textarea `readOnly`, tapi API
tidak menjaga gerbangnya.

**Perbaikan** — `src/app/api/artifacts/[id]/route.ts`, awal blok PATCH setelah validasi body:

```ts
const existing = await getArtifactById(id);
if (!existing) {
  return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
}
if (existing.status === 'approved') {
  return NextResponse.json(
    { error: 'Artefak sudah disetujui — konten terkunci.' },
    { status: 409 }
  );
}
```

(Ini juga menghemat satu query: `updateArtifactContent` saat ini fetch 2× — existing
lalu baca ulang.)

**Ubah juga story doc:** baris I/O Matrix "Edit manual" tambahkan
`artifact approved → 409`.

---

### A3. Race 409-vs-upsert: cek status ulang tepat sebelum menulis PRD

**Masalah:** di `draft-prd`, cek `approved → 409` terjadi **sebelum** panggilan AI yang
berdetik lama. Jika PRD di-approve dari tab lain selama AI berjalan,
`upsertPrdArtifact` menimpa konten approved dan menyetel status kembali `draft`
(`UPDATE ... SET status='draft'` tanpa guard). Single-user memang, tapi guard-nya murah.

**Perbaikan (pilih salah satu):**

Opsi 1 — guard di SQL (paling solid), `src/lib/db/index.ts` `upsertPrdArtifact`:

```ts
const res = await client.execute({
  sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now')
        WHERE id = ? AND status != 'approved'`,
  args: [content, existing.id],
});
if (res.rowsAffected === 0) {
  throw new Error('PRD_APPROVED_RACE'); // route menangkapnya → 409
}
```

Opsi 2 — cek ulang status di route tepat sebelum `upsertPrdArtifact`.

**Ubah juga story doc:** Design Notes "Keputusan 409" tambahkan satu kalimat bahwa
guard juga ada di level SQL, bukan hanya cek awal route.

---

### A4. Filter GET dengan *nilai* tak dikenal melanggar kontrak story

**Masalah:** story menjanjikan "filter tak dikenal diabaikan (kembalikan semua)",
tapi implementasi hanya mengabaikan **key** yang tak dikenal. `?stage=bogus` di-cast
`as ArtifactStage` (bohong ke compiler) lalu masuk SQL → hasil `[]`, bukan semua.

**Perbaikan** — `src/app/api/projects/[id]/artifacts/route.ts`:

```ts
const STAGES: readonly string[] = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];
const TYPES: readonly string[] = ['brief', 'prd', 'spec', 'story', 'handoff', 'design', 'test-plan', 'deploy-checklist', 'retro'];

const stageParam = searchParams.get('stage');
const typeParam = searchParams.get('type');
const artifacts = await getArtifactsByProject(projectId, {
  stage: stageParam && STAGES.includes(stageParam) ? (stageParam as ArtifactStage) : undefined,
  type: typeParam && TYPES.includes(typeParam) ? (typeParam as ArtifactType) : undefined,
});
```

Lebih baik lagi: ekspor union runtime dari `src/types/index.ts` (array konstan +
type darinya) agar satu sumber kebenaran.

---

## Grup B — Ketahanan & UI

### B1. Klasifikasi error AI terlalu longgar

**Masalah:** `/API key|AI_MODEL|quota|API/i` — alternatif `API` mencocokkan hampir
semua pesan error (termasuk bug SQL/network), sehingga user disuruh cek API key padahal
bukan itu penyebabnya.

**Perbaikan** — `src/app/api/projects/[id]/draft-prd/route.ts`:

```ts
const isConfigError =
  /API[_ ]?key|API_KEY/i.test(err.message) ||
  /AI_MODEL/i.test(err.message) ||
  /quota|resource_exhausted|rate limit|429/i.test(err.message);
```

Jangan pakai pola `API` polos. Bandingkan dengan pola existing yang lebih ketat di
`src/app/api/chat/route.ts` (`/quota|resource_exhausted|rate limit/i`).

---

### B2. `loadArtifacts` menimpa edit yang belum disimpan

**Masalah:** setelah setiap aksi (draft/simpan/approve), `loadArtifacts` menyetel ulang
`brief` dan `prdContent` dari server. Edit brief yang belum di-draft ulang, atau edit
PRD yang belum disimpan, hilang diam-diam.

**Perbaikan minimal** — lacak dirty state:

```ts
const briefDirty = useRef(false);
const prdDirty = useRef(false);
// onChange textarea: briefDirty.current = true;
// di loadArtifacts:
if (!briefDirty.current && briefContent) setBrief(briefContent);
if (!prdDirty.current && prd) setPrdContent(prd.content);
// reset dirty flag setelah draft/simpan berhasil (server state = lokal state)
```

**Perbaikan alternatif** (lebih sederhana, disarankan untuk single-user): hanya
refresh `prdId`/`prdStatus`/daftar artefak setelah aksi; konten textarea tidak pernah
ditimpa otomatis kecuali tepat setelah generate AI sukses (itu memang konten baru).

---

### B3. Regex blok pertanyaan rentan CRLF/trailing space

**Masalah:** `/## Pertanyaan Kritis Belum Terjawab\n/` gagal bila ada trailing space
atau `\r\n` (edit manual di editor Windows) → blok Pertanyaan Kritis hilang diam-diam
dari UI.

**Perbaikan** — `src/app/dashboard/[projectId]/page.tsx`:

```ts
const match = content.match(/## Pertanyaan Kritis Belum Terjawab[^\n]*\r?\n([\s\S]*)$/);
```

---

### B4. Sentinel "(Tidak ada pertanyaan)" harus satu sumber kebenaran

**Masalah:** string sentinel diduplikasi di `prd-prompt.ts` (`composePrdContent`) dan
`page.tsx` (`extractQuestions`). Perubahan kata di satu sisi membuat teks sentinel
tampil sebagai pertanyaan sungguhan.

**Perbaikan** — `src/lib/ai/prd-prompt.ts`:

```ts
export const NO_QUESTIONS_SENTINEL = '(Tidak ada — semua asumsi kunci sudah tertutup oleh brief.)';
export const QUESTIONS_HEADING = '## Pertanyaan Kritis Belum Terjawab';
```

Pakai di `composePrdContent`, di prompt sistem (aturan #2), dan di `extractQuestions`
(import dari `@/lib/ai/prd-prompt`).

---

### B5. Strip fence: toleransi teks di luar fence

**Masalah:** regex fence anchored `^…$` — satu kalimat pembuka sebelum fence membuat
parse gagal → 502, padahal JSON valid ada di dalam.

**Perbaikan** — `src/lib/ai/prd-prompt.ts` `parsePrdResponse`, fallback setelah strip
fence gagal:

```ts
if (!fenceMatch) {
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) text = brace[0];
}
```

---

### B6. Cast `params?.id` di halaman detail

**Masalah:** `useParams()` bisa mengembalikan `string | string[]`; cast `as string`
menghasilkan id `"a,b"` pada kasus array → semua fetch 404 dengan pesan menyesatkan.

**Perbaikan** — `src/app/dashboard/[projectId]/page.tsx`:

```ts
const raw = params?.id;
const projectId = Array.isArray(raw) ? raw[0] : raw;
```

---

### B7. Error path `loadArtifacts`/`loadProject` ditelan diam

**Masalah:** fetch gagal (bukan 404) atau throw → UI menampilkan data stale tanpa
sinyal; user bisa mengapprove berdasarkan state yang sebenarnya gagal dimuat.

**Perbaikan** — set `setError('Gagal memuat data proyek — muat ulang halaman.')` pada
path non-ok/throw. Cukup di `loadProject` (yang paling kritis).

---

### B8 (minor). Kebersihan kecil

- `upsertBriefArtifact`/`upsertPrdArtifact`: parameter `id` diabaikan di jalur update —
  jadikan `id?: string` + komentar, atau generate internal.
- `mapArtifactRow(row: any)` → `mapArtifactRow(row: Record<string, unknown>)`.
- Nomor baris `src/app/api/chat/route.ts:250` di Code Map story sudah bergeser —
  ganti dengan referensi simbol ("pola `generateResponse` di chat route").

---

## Grup C — Test (tutup verification gap)

Semua endpoint/fungsi baru saat ini **nol test otomatis** (pencarian simbol di `tests/`
hanya match di `src/`). `npx playwright test` yang lulus hari ini hanya menjalankan
test story 1–2 yang tidak menyentuh kode baru.

### C1. Unit test parser (paling murah, paling dulu)

Fungsi murni — tidak perlu mock apa pun. Buat `tests/unit/prd-prompt.spec.ts`
(mengikuti runner existing) dengan kasus:

1. JSON polos → parsed.
2. JSON dibungkus ` ```json … ``` ` → parsed.
3. Kalimat pembuka sebelum fence → parsed (setelah perbaikan B5).
4. `prd_markdown` kosong / bukan string → throw.
5. `open_questions` hilang / berisi non-string → throw atau filter benar.
6. `composePrdContent` memuat heading sentinel + tiap pertanyaan jadi list item.
7. `composePrdContent` dengan 0 pertanyaan → memuat sentinel B4.

### C2. Test API endpoint approve & artifacts

Ikuti pola `tests/api/projects-status.spec.ts` (buat proyek, seed/cleanup via API):

- `POST /api/artifacts/[id]/approve` pada PRD draft → 200, status `approved`,
  `updated_at` berubah.
- Approve ulang → 200 dan **`updated_at` identik** (assert string sama).
- Approve id tak ada → 404. Approve type=`brief` → 409 (setelah A1).
- `PATCH` PRD draft → 200, `updated_at` baru; PATCH whitespace → 400;
  PATCH PRD approved → 409 (setelah A2).
- `GET /api/projects/[id]/artifacts` → filter `stage`/`type` valid menyaring;
  `?stage=bogus` → **semua** dikembalikan (setelah A4); project tak ada → 404.

### C3. Test API draft-prd (dengan fake provider)

Provider di-inject/mock agar deterministik (lensa verification-gap berhenti di
boundary inferensi — tidak perlu AI live):

- Body tidak valid / brief kosong / brief > 8000 → 400.
- Project tak ada → 404.
- PRD approved → 409, tidak ada perubahan.
- Provider error / JSON rusak → 502, **brief tetap tersimpan**, tidak ada artifact PRD.
- Sukses → `{briefArtifact, prdArtifact}`, regenerate menimpa konten (bukan insert baru
  — asersi jumlah artifact type=prd tetap 1).

### C4. Update story doc — Verification section

Ganti klaim verifikasi (saat ini hanya smoke-test manual + playwright lama) dengan:

```md
**Commands:**
- `npx tsc --noEmit` -- expected: bersih.
- `npx playwright test` -- expected: semua lulus, TERMASUK test baru C1–C3.
```

---

## Grup D — Edit dokumen story (editorial)

Terapkan hasil lensa structure + prose pada
`_bmad-output/specs/spec-meja-kendali/stories/3-wizard-planning-brief-ke-draf-prd.md`:

1. **CUT** heading kosong `## Spec Change Log` dan `## Review Triage Log`.
2. **CONDENSE** pengulangan disiplin `updated_at` (muncul 4×) — satu pernyataan
   kanonik di Boundaries; lokasi lain cukup merujuk.
3. **MERGE** 3 "Keputusan implementasi" di Implementation Notes ke Design Notes
   (satu rumah untuk semua keputusan).
4. **MOVE** laporan smoke-test dari Implementation Notes ke Verification.
5. **MOVE** kontrak heading `## Pertanyaan Kritis Belum Terjawab` ke Boundaries/Always
   — ia adalah antarmuka prompt↔parser↔UI, jangan biarkan insidental.
6. **I/O Matrix**: baris "Regenerate (draft ada)" tambahkan error path 502;
   baris "Approve" tambahkan `type=brief → 409` (A1); baris "Edit manual" tambahkan
   `approved → 409` (A2).
7. **Prose**: "menaftar" → "mendaftar"; "dicocokkan reviewer" → "dicocokkan oleh
   reviewer"; "berubah `selesai`" → "berubah menjadi `selesai`"; "sekedar" → "sekadar";
   konsistenkan istilah "chip status tahap".

---

## Urutan pengerjaan yang disarankan

| # | Item | Usaha | Dampak |
|---|------|-------|--------|
| 1 | A1 + A2 (guard approve/PATCH) | kecil | menutup 2 lubang kontrak terbesar |
| 2 | C1 (unit test parser) | kecil | menutup verification gap termurah |
| 3 | A3, A4 (race + filter) | sedang | kontrak story dipenuhi penuh |
| 4 | B1–B7 (ketahanan UI/parse) | sedang | hilangkan kegagalan diam-diam |
| 5 | C2–C3 (test API) | sedang-besar | perilaku baru terlindungi regresi |
| 6 | D (edit dokumen) | kecil | akurasi story untuk pembaca berikutnya |

Item A1–A4 dan C1 sebaiknya masuk sebelum status story keluar dari `in-review`;
sisanya bisa jadi follow-up kecil dalam story yang sama.
