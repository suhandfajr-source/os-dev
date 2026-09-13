# Analisis & Rekomendasi Perbaikan — Story 3 (Wizard Planning)

**Sumber review:** `_bmad-output/implementation-artifacts/review-story3-edge-case-hunter.md`
**Lens:** edge-case-hunter (BMad Review)
**Difusan:** 2026 — triase atas unified diff story 3 + claims check terhadap spec
**Total temuan:** 10 (2 falsifikasi claim, 8 celah path/edge case)

---

## Ringkasan Eksekutif

Dari 10 temuan, **5 bersifat prioritas tinggi** karena melanggar invariant yang secara eksplisit dijaga spec (zombie status, brief tidak pernah approved, filter tak dikenal diabaikan) atau menyebabkan user mengapprove konten yang salah:

| # | Temuan | Prioritas | Jenis |
|---|--------|-----------|-------|
| 1 | Filter GET tak dikenal tidak diabaikan → list kosong | 🔴 Tinggi | Claim falsified |
| 2 | PATCH bisa mengubah artifact `approved` | 🔴 Tinggi | Edge case |
| 3 | Approve bisa dipanggil untuk artifact `brief` | 🔴 Tinggi | Edge case |
| 4 | Approve konten basi (edit tanpa Simpan Draft) | 🔴 Tinggi | Edge case |
| 5 | Race check-then-act di draft-prd | 🟡 Sedang | Edge case |
| 6 | `open_questions` difilter, bukan ditolak | 🟡 Sedang | Claim falsified |
| 7 | Duplikasi heading "Pertanyaan Kritis" | 🟡 Sedang | Edge case |
| 8 | Fence-stripping hanya untuk fence penuh | 🟡 Sedang | Edge case |
| 9 | Regex deteksi error terlalu longgar (`API` bolak-balik) | 🟢 Rendah | Edge case |
| 10 | `loadProject` gagal diam-diam → stuck "Memuat…" | 🟢 Rendah | Edge case |

---

## Temuan 1 — Filter GET tak dikenal mengembalikan list kosong, bukan semua

**Lokasi:** `src/app/api/projects/[id]/artifacts/route.ts:17-24`
**Jenis:** Claim falsified (confidence: high)

### Masalah
Spec (I/O Matrix) dan komentar kode menyatakan *"filter tak dikenal diabaikan (kembalikan semua)"*. Namun implementasi hanya melakukan cast type tanpa validasi:

```ts
const stageParam = searchParams.get('stage') as ArtifactStage | null;
const typeParam = searchParams.get('type') as ArtifactType | null;
```

`?stage=ngawur` tetap bernilai string non-null → masuk ke klausa `stage = 'ngawur'` di SQL → hasil **array kosong**, bukan semua artifact. Klaim spec ternaktifkan.

### Rekomendasi
Validasi nilai filter terhadap union yang sah; nilai tak dikenal → `undefined` (diabaikan):

```ts
const VALID_STAGES = ['planning', 'design', 'development', 'testing', 'deployment', 'retro'] as const;
const VALID_TYPES = ['brief', 'prd', 'spec', 'story', 'handoff', 'design', 'test-plan', 'deploy-checklist', 'retro'] as const;

const stageRaw = searchParams.get('stage');
const typeRaw = searchParams.get('type');

const stage = VALID_STAGES.includes(stageRaw as ArtifactStage) ? (stageRaw as ArtifactStage) : undefined;
const type = VALID_TYPES.includes(typeRaw as ArtifactType) ? (typeRaw as ArtifactType) : undefined;
```

Alternatif lebih tipe-safe: ekspor konstanta union dari `src/types/index.ts` (mis. `ARTIFACT_STAGES`, `ARTIFACT_TYPES`) agar validasi dan union tidak bisa saling meleset saat salah satu diubah.

---

## Temuan 2 — PATCH bisa mengubah artifact yang sudah `approved`

**Lokasi:** `src/app/api/artifacts/[id]/route.ts:28-41` (PATCH)
**Jenis:** Edge case

### Masalah
UI men-disable textarea saat `approved`, tapi API tidak punya gerbang yang sama. `PATCH /api/artifacts/{id}` pada artifact `approved` akan **berhasil 200** dan mengubah konten — status tetap `approved`. Ini persis efek zombie ("approved tapi konten draft?") yang spec larang via klausul Never, hanya lewat pintu berbeda.

### Rekomendasi
Tolak PATCH pada artifact approved:

```ts
const existing = await getArtifactById(id);
if (!existing) {
  return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
}
if (existing.status === 'approved') {
  return NextResponse.json({ error: 'Artefak sudah disetujui dan tidak bisa diedit.' }, { status: 409 });
}
const artifact = await updateArtifactContent(id, content);
```

Catatan: `updateArtifactContent` juga sudah melakukan `getArtifactById` internal — agar tidak double-read, opsional ubah signature-nya jadi menerima `id` dan kembalikan `{ artifact, existing }`, atau cukup biarkan (murah untuk personal tool).

---

## Temuan 3 — Approve bisa dipanggil untuk artifact `brief`

**Lokasi:** `src/lib/db/index.ts` — `approveArtifact` (hunk baru)
**Jenis:** Edge case

### Masalah
`approveArtifact(id)` menyetujui **artifact apa pun** tanpa cek `type`/`stage`. Spec (Design Notes) menegaskan: *"hanya approve artifact type=prd yang membuat selesai; brief sengaja selalu draft dan tidak pernah approved"*. `POST /api/artifacts/{briefId}/approve` → 200, brief jadi `approved` → invariant pecah, dan derivasi status planning menjadi ambigu.

### Rekomendasi
Tambahkan gerbang di level **route** (lebih tepat untuk mapping HTTP) dan jaga di level **DB** (defense in depth):

```ts
// route: src/app/api/artifacts/[id]/approve/route.ts
const artifact = await approveArtifact(id);
if (!artifact) return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });

// db: approveArtifact — guard tipe
if (existing.type !== 'prd') {
  return null; // atau throw domain error yang route petakan ke 409
}
```

Pilihan paling bersih: `approveArtifact` hanya menerima artifact type=`prd` (return `null`/throw jika bukan), route memetakan ke 409 `{ error: 'Hanya PRD yang bisa disetujui.' }`.

---

## Temuan 4 — Approve konten basi: edit → Setujui tanpa Simpan Draft

**Lokasi:** `src/app/dashboard/[projectId]/page.tsx` — `handleApprove`
**Jenis:** Edge case (UI, dampak data)

### Masalah
User mengedit isi textarea PRD, lalu langsung klik **Setujui PRD** tanpa menekan Simpan Draft. Yang diapprove adalah **konten lama yang tersimpan di DB**, sedangkan layar menampilkan konten hasil edit. Status jadi `approved` untuk konten yang tidak pernah dilihat/disetujui benar-benar oleh user — bug tingkat kepercayaan, sulit dideteksi.

### Rekomendasi (pilih salah satu, opsi A paling aman)

**A. Auto-save sebelum approve** (disarankan — tanpa mengubah alur user):

```ts
const handleApprove = async () => {
  if (!prdId) return;
  setError(''); setNotice('');
  setBusy(true);
  try {
    // pastikan konten yang terlihat = konten yang disetujui
    const saveRes = await fetch(`/api/artifacts/${prdId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: prdContent }),
    });
    if (!saveRes.ok) {
      const d = await saveRes.json().catch(() => ({}));
      setError(d.error || 'Gagal menyimpan sebelum menyetujui.');
      return;
    }
    const res = await fetch(`/api/artifacts/${prdId}/approve`, { method: 'POST' });
    // ...lanjutan existing
```

**B. Deteksi dirty state:** simpan `lastSavedContent` saat load/save; disable tombol Setujui (dengan title penjelasan) selama `prdContent !== lastSavedContent`.

Catatan: jika Temuan 2 diterapkan (409 untuk PATCH approved), auto-save di opsi A harus dilewati ketika `prdStatus === 'approved'` — tambahkan guard `if (prdStatus !== 'approved')` sebelum PATCH.

---

## Temuan 5 — Race check-then-act di `draft-prd` (409 vs upsert)

**Lokasi:** `src/app/api/projects/[id]/draft-prd/route.ts:46-60` + `upsertPrdArtifact`
**Jenis:** Edge case (concurrency)

### Masalah
Cek `existingPrd.status === 'approved'` dan `upsertPrdArtifact` adalah dua langkah terpisah tanpa atomisitas. Dua POST bersamaan (atau approve yang balapan dengan regenerate) bisa membuat PRD approved tertimpa kembali menjadi `draft`. UI mitigasi dengan disable tombol (single-user), tapi API tetap terbuka.

### Rekomendasi
Jadikan upsert kondisional pada status — tetap satu query, tanpa skema baru:

```ts
// upsertPrdArtifact: pada jalur UPDATE
const res = await client.execute({
  sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now')
        WHERE id = ? AND status = 'draft'`,
  args: [content, existing.id],
});
if (res.rowsAffected === 0) {
  throw new Error('PRD_ALREADY_APPROVED'); // route petakan ke 409
}
```

Ini menghilangkan window race di jalur UPDATE. Untuk jalur INSERT ganda (dua POST pertama bersamaan), tambahkan `UNIQUE(project_id, stage, type)` pada tabel artifact bila kontrak skema mengizinkan index (bukan kolom/tabel baru) — jika tidak, sad-risk single-user dapat diterima seperti keputusan Design Notes, cukup catat.

---

## Temuan 6 — `open_questions` campuran difilter, bukan ditolak 502

**Lokasi:** `src/lib/ai/prd-prompt.ts:56-60`
**Jenis:** Claim falsified (confidence: medium)

### Masalah
Spec: *"tolak `prd_markdown` kosong dan `open_questions` bukan array-of-string → 502"*. Implementasi justru **memfilter** elemen non-string:

```ts
const questions = Array.isArray(obj.open_questions)
  ? obj.open_questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
  : null;
```

Akibatnya `open_questions: [1, "a"]` diterima (jadi `["a"]`), dan `[1, 2]` diterima sebagai daftar kosong — padahal spec menyuruh 502.

### Rekomendasi
Pilih kebijakan yang konsisten — **ketat sesuai spec**:

```ts
const questionsRaw = obj.open_questions;
const isValid =
  Array.isArray(questionsRaw) &&
  questionsRaw.every((q) => typeof q === 'string' && q.trim().length > 0);
if (!isValid) {
  throw new Error('Draf AI tidak valid (daftar pertanyaan kritis bukan array-of-string). Silakan coba lagi.');
}
const questions = questionsRaw as string[];
```

Jika ingin tetap toleran (lenient), ubah redaksinya di spec Always agar claim dan kode sama — jangan biarkan keduanya berbeda.

---

## Temuan 7 — Duplikasi blok "Pertanyaan Kritis" (prompt memerintahkan, compose menambah lagi)

**Lokasi:** `src/lib/ai/prd-prompt.ts` — `PRD_SYSTEM_PROMPT` rule 2 vs `composePrdContent:73-80`
**Jenis:** Edge case

### Masalah
System prompt **rule 2** menyuruh AI membuat bagian `## Pertanyaan Kritis Belum Terjawab` **di dalam** `prd_markdown`. Sementara `composePrdContent` **menambahkan heading yang sama lagi** di akhir konten. `extractQuestions` di UI memakai regex `/## Pertanyaan Kritis Belum Terjawab\n([\s\S]*)$/` yang menangkap dari **kemunculan pertama sampai akhir** → semua pertanyaan tampil **dua kali** di blok kuning UI.

### Rekomendasi
Satu sumber kebenaran: pertanyaan kritis **hanya** dari `open_questions` yang di-append `composePrdContent`. Strip section itu dari `prd_markdown` sebelum compose:

```ts
export function composePrdContent(ai: PrdAiResponse): string {
  // buang versi heading yang mungkin sudah dibuat AI di dalam prd_markdown
  const idx = ai.prd_markdown.indexOf('## Pertanyaan Kritis Belum Terjawab');
  const prd = (idx >= 0 ? ai.prd_markdown.slice(0, idx) : ai.prd_markdown).trimEnd();
  // ...lanjutan questionBlock existing pakai prd
}
```

Tambahan defensif di UI: gunakan `lastIndexOf` alih-alih `match(...)$/` jika ingin tetap tahan terhadap heading ganda.

---

## Temuan 8 — Fence-stripping hanya menangani fence yang membungkus seluruh teks

**Lokasi:** `src/lib/ai/prd-prompt.ts:44-48`
**Jenis:** Edge case

### Masalah
Regex `/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/` hanya cocok bila fence membungkus **seluruh** respons. Pola nyata yang lolos dan gagal parse (→ 502 padahal JSON valid):
- teks pembuka sebelum fence: `Berikut JSON-nya:\n```json\n{...}\n```` 
- fence inline tanpa newline: `​```json{...}````

### Rekomendasi
Tambah fallback ekstraksi objek JSON setelah regex fence gagal:

```ts
const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
if (fenceMatch) text = fenceMatch[1].trim();

if (!text.startsWith('{')) {
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) text = text.slice(s, e + 1);
}
```

`JSON.parse` berikutnya tetap menjadi validator akhir, jadi fallback ini tidak melemaskan validasi.

---

## Temuan 9 — Regex klasifikasi error terlalu longgar (bare `API`)

**Lokasi:** `src/app/api/projects/[id]/draft-prd/route.ts:75-79`
**Jenis:** Edge case

### Masalah
`/API key|AI_MODEL|quota|API/i` — alternatif `API` sendirian cocok dengan hampir semua pesan error (termasuk error DB libsql yang menyebut "API", error fetch, dll). Akibatnya error non-config dilaporkan sebagai *"periksa AI_API_KEY / AI_MODEL"* → menyesatkan debugging.

### Rekomendasi

```ts
const message =
  err instanceof Error && /API key|AI[_-]MODEL|quota|rate.?limit/i.test(err.message)
    ? 'Gagal menghubungi AI — periksa konfigurasi AI_API_KEY / AI_MODEL di environment.'
    : 'Gagal membuat draf PRD dari AI. Silakan coba lagi.';
```

Idealnya, buat error konfigurasi **dikenali dari sumbernya** (throw jenis error khusus dari provider wrapper) alih-alih menebak dari teks pesan — tapi untuk scope personal tool, perbaikan regex cukup.

---

## Temuan 10 — `loadProject` gagal diam-diam → halaman stuck "Memuat…"

**Lokasi:** `src/app/dashboard/[projectId]/page.tsx` — `loadProject`
**Jenis:** Edge case (UI)

### Masalah
Hanya 404 (→ `notFound`) dan `res.ok` yang ditangani. Response 500 atau kegagalan jaringan (catch) tidak mengubah state apa pun → header selamanya "Memuat…" tanpa error, tanpa retry.

### Rekomendasi

```ts
const loadProject = useCallback(async () => {
  try {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.status === 404) { setNotFound(true); return; }
    if (res.ok) {
      setProject((await res.json()).project);
    } else {
      setError('Gagal memuat proyek. Coba muat ulang halaman.');
    }
  } catch (err) {
    console.error('Failed to fetch project:', err);
    setError('Gagal memuat proyek. Periksa koneksi lalu muat ulang.');
  }
}, [projectId]);
```

Terapkan pola sama pada `loadArtifacts` (minimal tampilkan error, jangan diam).

---

## Urutan Penerapan yang Disarankan

1. **Bersama-sama (satu commit kecil):** Temuan 2 + 3 + 1 — gerbang status/tipe + validasi filter. Ketiganya perubahan kecil di route/DB, memperbaiki klaim spec yang dinaktifkan.
2. **Temuan 4** — auto-save sebelum approve (UI saja, terlihat langsung oleh user).
3. **Temuan 5 + 6 + 7 + 8** — hardening `draft-prd`/`prd-prompt` (satu commit "parser & race hardening").
4. **Temuan 9 + 10** — polish pesan error & state loading.
5. Setelah diterapkan: jalankan `npx tsc --noEmit` + `npx playwright test`, dan tambahkan smoke manual: PATCH artifact approved → 409; approve brief → 409; `?stage=ngawur` → semua artifact.

## Catatan Triage untuk Spec

Dua klaim spec perlu disinkronkan setelah fix (isi bagian `Review Triage Log` di story):
- I/O Matrix baris "Lihat artefak" — klaim "filter tak dikenal diabaikan" kini benar-benar dijamin kode (Temuan 1).
- Always "tolak `open_questions` bukan array-of-string → 502" — pilih ketat (kode diubah) atau toleran (spec diubah); jangan keduanya berbeda.
