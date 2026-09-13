Read the review instructions below completely and follow them as your review instructions.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. If the instruction file is unreadable, report that exact failure and stop. Return your findings as text in your final message.

The review content (unified diff) is inlined after the instructions. Catatan: repo kini punya Playwright tests (tests/api/*.spec.ts, tests/e2e/*.spec.ts) — periksa coverage fitur baru di sana.

===== REVIEW INSTRUCTIONS (verification-gap) =====
# Verification Gap Review

**Goal:** Find changed behavior that could break without reliable verification catching it. Ask one question — "if the behavior this change is supposed to produce broke where it's actually used, would verification fail?" Do not hunt for correctness bugs, but report genuine problems you notice while tracing verification.

The main verification gap shapes are:

1. **Regression gap:** the changed code regresses where it's used, and no test covering that use would fail.
2. **Missing-adoption gap:** a place that should now use the new behavior doesn't; it handles the same case its own way, or not at all, and no test would flag the omission.
3. **Broken-verification gap:** a test appears to cover the changed behavior, but would not actually protect it because it is skipped, flaky, not run in the normal verification path, or too weak to observe the regression.

## Evidence Rules

- Read a test before claiming what it covers, runs, asserts, or misses.
- Before claiming no test exists, search the whole repo by the symbol under test and by import references; expected file locations are not enough.
- Never assert what you did not verify. If a finding cannot be grounded, drop it.
- In a finding, say what you actually checked — "none of the tests I read cover this" — and show how far you looked. Say a test doesn't exist anywhere only when the symbol/import-reference search actually shows that.
- Do not assign severity, confidence, priority, or ranking.

## Review Sequence

### Step 1: Screen for behavioral change

Screen each part of the change separately. If a part is non-behavioral, skip it. Call a part non-behavioral only when the changed code does not alter return values, thrown errors, caller-visible side effects, or observable state (including iteration order and emitted messages). Once a part meets that test, move on; do not inspect callers or tests for extra confirmation.

Common non-behavioral examples: formatting, comments, whitespace; pure renames; trivial getters/setters and pass-throughs; type-only or compiler-enforced changes with no runtime effect; etc.

Only outcomes produced by deterministic code are worth automatically testing; tests are useless on static source text and brittle on LLM output. Skip those parts.

If every part is skipped, output the clean result (see Output Format).

### Step 2: Find the behavior that changed

Identify what behavior changed compared to the previous version: output, side effect, branch, error path, schema/event shape, config default, validation/authorization rule, external contract, etc. If the change affects more than one behavior, handle each separately.

Treat broad-impact changes as behavioral even when no single changed line looks important: dependency, toolchain, build/config, data-file, etc.

### Step 3: Trace where that behavior is used

Trace the changed behavior to the places that observe it. Start with direct callers and registered entry points (routes, commands, DI), contract consumers (schemas, events, APIs, database readers), and reverse-dependency info if already available.

Follow a path only while the changed behavior is reachable and unverified. Stop when a test at that boundary would fail, the consumer does not observe the changed behavior, or the next hop is guesswork (dynamic dispatch, reflection, outside-repo consumers, etc.). Prefer the nearest observable boundary, often one to three hops away, especially across contract, integration, or service edges. If there are more than five similar consumers, group obvious repeats and check representative paths; expand only when a consumer observes the behavior differently.

### Step 4: Qualify the consumer, then check its test

For each consumer, name the smallest realistic regression this consumer would observe: invert the branch, drop the default, omit the field, return the old error code, skip the integration call, etc. This is the Demonstration. If no such regression exists, drop the path; untested downstream code is not a finding.

A `Missing-adoption gap` qualifies not by the adoption failure alone but by a supersession signal: the change gives clear evidence the new behavior is meant to replace the local one — PR intent, naming or docs, a replaced sibling site, deleted duplicate logic, or a test defining the new rule — and the local site shares the same observable contract. Without a supersession signal and a shared observable contract, it is a refactor suggestion, not a verification-gap finding. Once both hold, check whether any test for that site would flag the non-adoption; missing coverage of the non-adoption is the gap itself, not a disqualifier.

Find and read the relevant test. Ask whether the Demonstration would make an assertion fail.

- If yes, the behavior is verified. No finding.
- For a regression-style Demonstration: if no test runs the path, the test is skipped/flaky/not run normally, or the test runs the code without checking the changed result, report a `Regression gap` or `Broken-verification gap`.
- For a qualifying Missing-adoption case: if none of the site tests you found assert it adopts the new behavior, report a `Missing-adoption gap`.

A test counts only if it runs normally and an assertion observes the changed output, branch, or contract. These do not count: no execution; source-text assertions that match a file's wording instead of running it; success/no-throw/snapshot-only checks; mock/log-call checks; human-only checks; tests that mock away the integration; e2e tests that pass through without checking the changed output; stale assertions or fixtures.

For example, `expect(x ?? DEFAULT).toBe(DEFAULT)` passes when `x` is missing.

Common patterns:

- **Caller-path gap** — helper test covers the branch, but caller values skip it.
- **Contract drift** — payload/schema/event changes must be verified at the consumer.
- **Migration compatibility** — tests only create new-format rows or fresh schemas.
- **Phantom exception** — handled partial-failure path has no test.
- **Missing-adoption gap** — sibling site should use the new rule/helper and does not.
- **Removed verification** — deleted test or weakened assertion leaves behavior unpinned; removing a source-text assertion is not this, since it never counted.

### Step 5: Confirm each finding is real

Before writing a finding, re-open the specific tests or search results the finding relies on. Verify the Demonstration would not make any test you checked fail, or that the absence claim is backed by the symbol/import-reference search. Do not claim more than you verified; drop any finding you cannot ground.

Explain why the test misses the bug using what the test sets up and checks.

Do not report: compiler/type-checker-enforced cases; behavior already verified by an integration, contract, or e2e test; implementation-detail or mock-only tests; low coverage or a missing test file by itself; legacy untested code the change did not affect.

Report genuine problems you noticed while tracing verification, even if they are not verification gaps. Put them under `Other findings` in the output. This permits reporting what you already reached, not extra hunting. A claim that code misbehaves is a defect, not a gap — it goes under `Other findings` for standard triage, however you found it.

## OUTPUT FORMAT

Emit each verification-gap finding as one block. No general advice, no severity or confidence. Triage trusts a gap finding as filed and does not re-verify it, so each block must stand on its own evidence.

```markdown
### <one-line title naming the gap>

- **Changed surface:** the exact behavior or contract that changed — `file:line`.
- **Impacted consumer or site:** named concretely with `file:line` (e.g. "the `createInvoice` mutation used by the billing dashboard at `billing/dashboard.ts:88`," not "callers of this function").
- **Existing test evidence:**
  - `Regression gap`: what the relevant test actually asserts, with `file:line`; or, if none, the symbol/import-reference searches run and their result.
  - `Missing-adoption gap`: tests for the impacted site, and whether any assert it adopts the new behavior.
  - `Broken-verification gap`: the apparent test or verification path, and why it does not count.
- **Missing verification:** the precise assertion or check that's absent.
- **Demonstration:**
  - `Regression gap` / `Broken-verification gap`: the concrete regression that would ship undetected, and why the tests you checked would not fail.
  - `Missing-adoption gap`: the case the site mishandles by not adopting the new behavior, and that none of the tests you read assert adoption.
- **Consequence:** the concrete thing that ships wrong — a regression the checked evidence would not catch, or a site that should use the new behavior and doesn't.
- **Disposition:** `patch` — name the test to add, fit to the repo's own way of verifying (don't impose a generic test pyramid) — or `defer` when the gap is real but not worth closing as part of this change, with one sentence of why.
```

If you noticed genuine non-gap problems while tracing verification, append:

```markdown
## Other findings

- <description only; no severity, confidence, priority, or ranking>
```

When you find no verification gaps and no other findings, output exactly this single line, not an empty response:

`No verification gaps found.`

## CONTENT SOURCE

"Review content:" in the message that launched you gives the content itself or a path to read it from. Read the file when it is a path; either way that is the content under review, and this instruction file never is. If no content is supplied, or the file it points to is missing, empty, or unreadable, say exactly that and stop — never report a clean review for content you could not read.

===== REVIEW CONTENT (unified diff) =====
----- BEGIN DIFF -----
diff --git a/_bmad-output/specs/spec-meja-kendali/stories/3-wizard-planning-brief-ke-draf-prd.md b/_bmad-output/specs/spec-meja-kendali/stories/3-wizard-planning-brief-ke-draf-prd.md
new file mode 100644
index 0000000..b45ddf7
--- /dev/null
+++ b/_bmad-output/specs/spec-meja-kendali/stories/3-wizard-planning-brief-ke-draf-prd.md
@@ -0,0 +1,107 @@
+---
+title: 'Wizard Planning — Brief ke draf PRD'
+type: 'feature'
+created: '2026-09-13'
+status: 'in-review'
+route: 'dispatch'
+review_loop_iteration: 0
+baseline_commit: '37c9526c7cf59a557e515e93c5d61889921510dc'
+context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
+---
+
+<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">
+
+## Intent
+
+**Problem:** Tahap Planning di Meja Kendali belum punya wizard — user belum bisa mengubah ide mentah (brief) menjadi draf PRD yang terstruktur dengan bantuan AI, lalu menyetujuinya sebagai artefak (CAP-3 + CAP-5). Ini wizard pertama; polanya akan ditiru wizard berikutnya.
+
+**Approach:** Halaman detail proyek `/dashboard/[projectId]` berisi wizard Planning: user mengisi brief → brief **disimpan dulu sebagai artifact** → AI (tier berat, `AI_MODEL`) mendraf PRD → user me-review, mengedit, lalu menyetujui. Kegagalan AI tidak menghilangkan brief. Kualitas draf wajib: PRD memuat bagian **`## Cakupan Fitur dari Brief`** yang menaftar setiap fitur yang teridentifikasi dari brief, plus **daftar pertanyaan kritis** yang ditampilkan sebagai blok tersendiri di wizard — bukan draf generik yang sekadar "bisa disetujui". Bentuk wizard/form, bukan chat-driven.
+
+</frozen-after-approval>
+
+## Boundaries & Constraints
+
+**Always:**
+- Semua panggilan AI memakai `getAIProvider().generateResponse` existing dengan `responseMimeType: application/json` (pola `src/app/api/chat/route.ts`) — tanpa provider/library baru.
+- Alur `draft-prd`: simpan/upsert `artifact` type=`brief` status=`draft` **lebih dulu**, baru panggil AI — kegagalan AI tidak menghapus brief.
+- Satu brief dan satu PRD per proyek: fungsi DB untuk keduanya **upsert** terhadap artifact existing (bukan insert baru).
+- `approve`: set status → `approved` dan set `updated_at` eksplisit (SQLite tanpa ON UPDATE); **approve ulang = 200 tanpa menyentuh `updated_at`**.
+- Validasi respons AI sebelum dipakai: strip code fence markdown, parse JSON, tolak `prd_markdown` kosong dan `open_questions` bukan array-of-string → 502 tanpa artifact PRD tersimpan.
+- Brief maksimal 8.000 karakter.
+
+**Never:**
+- Jangan mengubah perilaku chat WhatsApp existing atau provider `src/lib/ai/provider.ts`.
+- Jangan memanggil AI di jalur non-draf (approve/edit = murni DB).
+- Jangan membuat tabel/kolom baru di luar kontrak skema `architecture-diagrams.md`.
+- Jangan mengizinkan draft baru untuk PRD yang sudah `approved` (tutup rantai status zombie — lihat Design Notes).
+
+## I/O & Edge-Case Matrix
+
+| Scenario | Input / State | Expected Output / Behavior | Error Handling |
+|----------|--------------|---------------------------|----------------|
+| Draf PRD pertama | POST `/api/projects/[id]/draft-prd` `{brief}` (valid) | Brief tersimpan (upsert artifact type=`brief`) → AI dipanggil → artifact type=`prd` status=`draft` tersimpan, 200 `{briefArtifact, prdArtifact}` | brief kosong/whitespace → 400; brief > 8.000 char → 400; project tidak ada → 404; AI gagal/JSON tak valid → 502 `{error}` ramah-user — **brief tetap tersimpan, PRD tidak** |
+| Regenerate (draft ada) | POST sama, PRD draft existing | Konten PRD draft ditimpa (upsert), status tetap `draft`, `updated_at` baru | 404 jika project tidak ada |
+| Regenerate (PRD approved) | POST sama, PRD status=`approved` | **409** `{error: "PRD sudah disetujui"}` — tidak ada perubahan | — |
+| Edit manual | PATCH `/api/artifacts/[id]` `{content}` | 200 `{artifact}`, `updated_at` eksplisit ter-set | content kosong/whitespace → 400; id tidak ada → 404 |
+| Approve | POST `/api/artifacts/[id]/approve` | 200 `{artifact}` status=`approved`, `updated_at` baru; status tahap planning → `selesai` | id tidak ada → 404; approve ulang → 200, `updated_at` TIDAK berubah |
+| Lihat artefak | GET `/api/projects/[id]/artifacts` | 200 `{artifacts: [...]}` — filter `?stage=`/`?type=` dikenal menyaring; **filter tak dikenal diabaikan** (kembalikan semua) | project tidak ada → 404 |
+
+## Code Map
+
+- `src/lib/ai/provider.ts` -- `getAIProvider()` + `generateResponse({systemPrompt, messages})`, JSON via `responseMimeType`, fallback chain rate-limit — JANGAN diubah; panggil apa adanya.
+- `src/app/api/chat/route.ts:250` -- pola pemanggilan provider + penanganan error AI.
+- `src/lib/db/index.ts` -- tabel `artifact` sudah ada; tambah fungsi CRUD artifact mengikuti pola existing (`upsert` untuk brief & PRD, `updated_at = strftime('%Y-%m-%d %H:%M:%f','now')` eksplisit di semua path tulis kecuali approve-ulang).
+- `src/types/index.ts` -- tambah tipe `Artifact`, `ArtifactStage`, `ArtifactType`, `ArtifactStatus`.
+- `src/app/dashboard/page.tsx` -- kartu proyek dibungkus Link ke detail; chip status tetap berfungsi.
+- `src/app/dashboard/[projectId]/page.tsx` -- BARU: wizard Planning (form brief → draf PRD editable → approve); **blok "Pertanyaan Kritis" sebagai penekanan visual tersendiri**, bukan catatan kaki; tombol Setujui & Draf Ulang disabled saat generate berjalan (mitigasi race UI, single-user).
+- `src/app/api/projects/[id]/draft-prd/route.ts`, `src/app/api/projects/[id]/artifacts/route.ts`, `src/app/api/artifacts/[id]/route.ts`, `src/app/api/artifacts/[id]/approve/route.ts` -- BARU: endpoint wizard.
+- `src/lib/ai/prd-prompt.ts` -- BARU: system prompt drafter PRD (wajib bagian `## Cakupan Fitur dari Brief` + pertanyaan kritis) + `parsePrdResponse(text)` yang harden (strip fence, validasi field).
+
+## Tasks & Acceptance
+
+**Execution:**
+- [x] `src/types/index.ts` -- tipe `Artifact` + union `ArtifactStage`/`ArtifactType`/`ArtifactStatus` -- kontrak tipe lintas lapisan.
+- [x] `src/lib/db/index.ts` -- fungsi `upsertBriefArtifact`, `upsertPrdArtifact`, `getArtifactsByProject`, `getArtifactById`, `updateArtifactContent`, `approveArtifact` (set `updated_at` eksplisit di semua path tulis; approve-ulang tidak menyentuh `updated_at`) -- lapisan data.
+- [x] `src/lib/ai/prd-prompt.ts` -- system prompt PRD-drafter (bagian `## Cakupan Fitur dari Brief` wajib + pertanyaan kritis) + `parsePrdResponse(text)` strip-fence & validasi field -- logika prompt terpusat.
+- [x] `src/app/api/projects/[id]/draft-prd/route.ts` + `.../artifacts/route.ts` + `src/app/api/artifacts/[id]/route.ts` + `.../approve/route.ts` -- endpoint wizard sesuai I/O Matrix.
+- [x] `src/app/dashboard/page.tsx` -- judul kartu proyek jadi Link ke detail (tombol edit inline dipertahankan agar AC story 1 tetap terpenuhi) -- navigasi masuk wizard.
+- [x] `src/app/dashboard/[projectId]/page.tsx` -- wizard Planning: form brief, tombol draf AI, editor konten PRD, blok Pertanyaan Kritis menonjol, tombol Simpan Draft / Setujui / Draf Ulang (disabled saat generate), daftar artefak proyek (brief + PRD) dengan statusnya.
+
+**Acceptance Criteria:**
+- Given proyek ada, when membuka `/dashboard/[projectId]`, then wizard Planning tampil: form brief, artefak existing (brief/PRD) dengan statusnya, dan blok pertanyaan kritis bila ada.
+- Given brief yang menyebut beberapa fitur, when tombol draf AI ditekan, then brief tersimpan sebagai artifact `brief`, artifact PRD draft tersimpan, dan bagian `## Cakupan Fitur dari Brief` di konten PRD **dapat dicocokkan reviewer secara visual dengan daftar fitur di brief** (penilaian kualitas tetap manusia — bukan test AI-in-the-loop).
+- Given draft PRD ada, when user mengedit konten lalu menyetujui, then status artifact jadi `approved` dan chip tahap Planning di **halaman daftar berubah `selesai` saat kembali/refresh halaman daftar**.
+- Given AI gagal/JSON tidak valid, when draf diminta, then user melihat pesan error jelas, brief tetap tersimpan, dan TIDAK ada artifact PRD tersimpan.
+- Given PRD sudah `approved`, when user minta draf ulang, then 409 dan tidak ada yang berubah.
+- Given WhatsApp mode dipakai normal, then perilaku tidak berubah.
+
+## Implementation Notes
+
+- Semua task selesai; verifikasi smoke-test dengan AI asli: brief 3 fitur → PRD draft memuat `## Cakupan Fitur dari Brief` (semua fitur cocok) + blok pertanyaan kritis; approve → planning `selesai` di peta status; regenerate setelah approve → 409; approve-ulang `updated_at` tidak berubah; 400 untuk brief kosong/whitespace & PATCH whitespace; filter GET tak dikenal diabaikan.
+- Keputusan implementasi: penulisan judul kartu dihalaman daftar jadi Link ke detail, tetapi tombol edit inline dipertahankan — menggantinya akan mematahkan AC story 1 (edit dari daftar) yang dijaga test e2e.
+- Keputusan implementasi: blok pertanyaan kritis diekstrak dari konten PRD via regex `## Pertanyaan Kritis Belum Terjawab` di UI — konten tetap satu kolom `content` sesuai kontrak skema.
+- Keputusan implementasi: pesan 502 AI-failure mendeteksi kata kunci config (API key/quota/model) agar menunjuk penyebab, sesuai mitigasi pre-mortem A1.
+
+## Spec Change Log
+
+## Review Triage Log
+
+## Design Notes
+
+- Keputusan routing: detail proyek di `/dashboard/[projectId]` (bukan modal) — wizard tahap berikutnya (Design, Development, dst.) akan menumpang halaman ini.
+- Keputusan siklus draf: regenerate/simpan menimpa konten PRD yang belum approved; riwayat versi bukan scope story ini (changelog = story 5). Sad-risk single-user, diterima.
+- Keputusan 409 regenerate-setelah-approve: menutup efek domino status zombie ("approved tapi konten draft?") — satu gerbang, seluruh rantai aman.
+- Keputusan derivasi status planning: hanya approve artifact type=`prd` yang membuat `selesai`; brief sengaja selalu `draft` dan tidak pernah approved (A5, terdokumentasi).
+- Keputusan filter GET tak dikenal: diabaikan (kembalikan semua) — sederhana, konsisten personal-tool.
+- Bentuk respons AI: `{ "prd_markdown": string, "open_questions": string[] }` — parser menggabungkan keduanya menjadi satu konten markdown + blok pertanyaan.
+
+## Verification
+
+**Commands:**
+- `npx tsc --noEmit` -- expected: bersih.
+- `npx playwright test` -- expected: semua lulus (termasuk test story 1-2 yang menandakan tanpa regresi).
+
+**Manual checks:**
+- `/dashboard/[projectId]`: isi brief nyata → brief tersimpan → draf AI muncul (periksa `## Cakupan Fitur dari Brief` cocok dengan brief + blok pertanyaan kritis menonjol) → edit → setujui → chip Planning di halaman daftar `selesai` setelah kembali/refresh.
+- Error path: brief kosong → 400; brief > 8.000 char → 400; (opsional) matikan API key / salah-set `AI_MODEL` → 502 dengan pesan menunjuk konfigurasi, brief tetap ada, tanpa artifact PRD.
+- Regenerate saat PRD approved → 409 tampil jelas di UI.
diff --git a/src/app/api/artifacts/[id]/approve/route.ts b/src/app/api/artifacts/[id]/approve/route.ts
new file mode 100644
index 0000000..fbb5058
--- /dev/null
+++ b/src/app/api/artifacts/[id]/approve/route.ts
@@ -0,0 +1,22 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { approveArtifact } from '@/lib/db';
+
+export const runtime = 'nodejs';
+
+type RouteContext = { params: Promise<{ id: string }> };
+
+// POST /api/artifacts/[id]/approve — set status approved.
+// Approve ulang = no-op aman 200, updated_at TIDAK diubah (berbohong soal konten).
+export async function POST(_req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const artifact = await approveArtifact(id);
+    if (!artifact) {
+      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ artifact });
+  } catch (err: unknown) {
+    console.error('Error approving artifact:', err);
+    return NextResponse.json({ error: 'Gagal menyetujui artefak.' }, { status: 500 });
+  }
+}
diff --git a/src/app/api/artifacts/[id]/route.ts b/src/app/api/artifacts/[id]/route.ts
new file mode 100644
index 0000000..eba57a6
--- /dev/null
+++ b/src/app/api/artifacts/[id]/route.ts
@@ -0,0 +1,44 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { getArtifactById, updateArtifactContent } from '@/lib/db';
+
+export const runtime = 'nodejs';
+
+type RouteContext = { params: Promise<{ id: string }> };
+
+export async function GET(_req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const artifact = await getArtifactById(id);
+    if (!artifact) {
+      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ artifact });
+  } catch (err: unknown) {
+    console.error('Error fetching artifact:', err);
+    return NextResponse.json({ error: 'Gagal memuat artefak.' }, { status: 500 });
+  }
+}
+
+export async function PATCH(req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const raw = await req.json().catch(() => null);
+    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
+      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
+    }
+    const content = typeof (raw as Record<string, unknown>).content === 'string' ? ((raw as { content: string }).content).trim() : '';
+
+    if (!content) {
+      return NextResponse.json({ error: 'Konten artefak wajib diisi.' }, { status: 400 });
+    }
+
+    const artifact = await updateArtifactContent(id, content);
+    if (!artifact) {
+      return NextResponse.json({ error: 'Artefak tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ artifact });
+  } catch (err: unknown) {
+    console.error('Error updating artifact:', err);
+    return NextResponse.json({ error: 'Gagal memperbarui artefak.' }, { status: 500 });
+  }
+}
diff --git a/src/app/api/projects/[id]/artifacts/route.ts b/src/app/api/projects/[id]/artifacts/route.ts
new file mode 100644
index 0000000..aee47e9
--- /dev/null
+++ b/src/app/api/projects/[id]/artifacts/route.ts
@@ -0,0 +1,31 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { getProjectById, getArtifactsByProject } from '@/lib/db';
+import { ArtifactStage, ArtifactType } from '@/types';
+
+export const runtime = 'nodejs';
+
+// GET /api/projects/[id]/artifacts?stage=&type=
+// Filter tak dikenal diabaikan (kembalikan semua) — keputusan desain story 3.
+export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
+  try {
+    const { id: projectId } = await ctx.params;
+
+    const project = await getProjectById(projectId);
+    if (!project) {
+      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
+    }
+
+    const { searchParams } = new URL(req.url);
+    const stageParam = searchParams.get('stage') as ArtifactStage | null;
+    const typeParam = searchParams.get('type') as ArtifactType | null;
+
+    const artifacts = await getArtifactsByProject(projectId, {
+      stage: stageParam || undefined,
+      type: typeParam || undefined,
+    });
+    return NextResponse.json({ artifacts });
+  } catch (err: unknown) {
+    console.error('Error fetching artifacts:', err);
+    return NextResponse.json({ error: 'Gagal memuat artefak.' }, { status: 500 });
+  }
+}
diff --git a/src/app/api/projects/[id]/draft-prd/route.ts b/src/app/api/projects/[id]/draft-prd/route.ts
new file mode 100644
index 0000000..a641891
--- /dev/null
+++ b/src/app/api/projects/[id]/draft-prd/route.ts
@@ -0,0 +1,83 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { getProjectById, upsertBriefArtifact, upsertPrdArtifact, getArtifactRowByProjectStageType } from '@/lib/db';
+import { getAIProvider } from '@/lib/ai/provider';
+import { PRD_SYSTEM_PROMPT, buildPrdMessages, parsePrdResponse, composePrdContent } from '@/lib/ai/prd-prompt';
+import crypto from 'crypto';
+
+export const runtime = 'nodejs';
+
+const MAX_BRIEF_LENGTH = 8_000;
+
+export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
+  try {
+    const { id: projectId } = await ctx.params;
+
+    const project = await getProjectById(projectId);
+    if (!project) {
+      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
+    }
+
+    const raw = await req.json().catch(() => null);
+    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
+      return NextResponse.json({ error: 'Body request tidak valid.' }, { status: 400 });
+    }
+    const body = raw as Record<string, unknown>;
+    const brief = typeof body.brief === 'string' ? body.brief.trim() : '';
+
+    if (!brief) {
+      return NextResponse.json({ error: 'Brief wajib diisi.' }, { status: 400 });
+    }
+    if (brief.length > MAX_BRIEF_LENGTH) {
+      return NextResponse.json(
+        { error: `Brief maksimal ${MAX_BRIEF_LENGTH} karakter.` },
+        { status: 400 }
+      );
+    }
+
+    // Regenerate setelah approve ditutup: cegah status zombie "approved tapi konten draft"
+    const existingPrd = await getArtifactRowByProjectStageType(projectId, 'planning', 'prd');
+    if (existingPrd && existingPrd.status === 'approved') {
+      return NextResponse.json(
+        { error: 'PRD sudah disetujui. Tidak bisa membuat draf baru untuk PRD yang sudah approved.' },
+        { status: 409 }
+      );
+    }
+
+    // 1. Persist brief DULU — kegagalan AI tidak menghilangkan tulisan user
+    const briefArtifact = await upsertBriefArtifact(projectId, brief, crypto.randomUUID());
+
+    // 2. Panggil AI (tier berat AI_MODEL via getAIProvider; JSON via responseMimeType)
+    const provider = getAIProvider();
+    const rawAi = await provider.generateResponse({
+      systemPrompt: PRD_SYSTEM_PROMPT,
+      messages: buildPrdMessages(brief),
+    });
+
+    // 3. Harden parse — gagal parse/field hilang = 502, tidak ada PRD tersimpan
+    let parsed;
+    try {
+      parsed = parsePrdResponse(rawAi);
+    } catch (err: unknown) {
+      console.error('PRD AI response invalid:', err);
+      return NextResponse.json(
+        {
+          error: err instanceof Error ? err.message : 'Draf AI tidak valid. Silakan coba lagi.',
+          briefArtifact,
+        },
+        { status: 502 }
+      );
+    }
+
+    // 4. Simpan PRD draft (upsert terhadap draft existing)
+    const prdArtifact = await upsertPrdArtifact(projectId, composePrdContent(parsed), crypto.randomUUID());
+
+    return NextResponse.json({ briefArtifact, prdArtifact });
+  } catch (err: unknown) {
+    console.error('Error drafting PRD:', err);
+    const message =
+      err instanceof Error && /API key|AI_MODEL|quota|API/i.test(err.message)
+        ? 'Gagal menghubungi AI — periksa konfigurasi AI_API_KEY / AI_MODEL di environment.'
+        : 'Gagal membuat draf PRD dari AI. Silakan coba lagi.';
+    return NextResponse.json({ error: message }, { status: 502 });
+  }
+}
diff --git a/src/app/dashboard/[projectId]/page.tsx b/src/app/dashboard/[projectId]/page.tsx
new file mode 100644
index 0000000..4ff4d89
--- /dev/null
+++ b/src/app/dashboard/[projectId]/page.tsx
@@ -0,0 +1,346 @@
+'use client';
+
+import React, { useState, useEffect, useCallback } from 'react';
+import Link from 'next/link';
+import { useParams } from 'next/navigation';
+import {
+  ArrowLeft,
+  FileText,
+  Sparkles,
+  Save,
+  CheckCircle2,
+  RefreshCw,
+  HelpCircle,
+  StickyNote,
+} from 'lucide-react';
+import { Artifact, Project } from '@/types';
+
+export default function ProjectDetailPage() {
+  const params = useParams();
+  const projectId = params?.id as string;
+
+  const [project, setProject] = useState<Project | null>(null);
+  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
+  const [notFound, setNotFound] = useState(false);
+
+  const [brief, setBrief] = useState('');
+  const [prdContent, setPrdContent] = useState('');
+  const [prdId, setPrdId] = useState<string | null>(null);
+  const [prdStatus, setPrdStatus] = useState<'draft' | 'approved' | null>(null);
+
+  const [generating, setGenerating] = useState(false);
+  const [busy, setBusy] = useState(false);
+  const [error, setError] = useState('');
+  const [notice, setNotice] = useState('');
+
+  const loadProject = useCallback(async () => {
+    try {
+      const res = await fetch(`/api/projects/${projectId}`);
+      if (res.status === 404) {
+        setNotFound(true);
+        return;
+      }
+      if (res.ok) {
+        setProject((await res.json()).project);
+      }
+    } catch (err) {
+      console.error('Failed to fetch project:', err);
+    }
+  }, [projectId]);
+
+  const loadArtifacts = useCallback(async () => {
+    try {
+      const res = await fetch(`/api/projects/${projectId}/artifacts`);
+      if (res.ok) {
+        const data = await res.json();
+        const list: Artifact[] = data.artifacts || [];
+        setArtifacts(list);
+        const prd = list.find((a) => a.type === 'prd');
+        const brief = list.find((a) => a.type === 'brief');
+        if (prd) {
+          setPrdId(prd.id);
+          setPrdStatus(prd.status);
+          setPrdContent(prd.content);
+        }
+        if (brief) setBrief(brief.content);
+      }
+    } catch (err) {
+      console.error('Failed to fetch artifacts:', err);
+    }
+  }, [projectId]);
+
+  useEffect(() => {
+    if (!projectId) return;
+    loadProject();
+    loadArtifacts();
+  }, [projectId, loadProject, loadArtifacts]);
+
+  const handleDraftPrd = async () => {
+    setError('');
+    setNotice('');
+    setGenerating(true);
+    try {
+      const res = await fetch(`/api/projects/${projectId}/draft-prd`, {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ brief }),
+      });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Gagal membuat draf PRD.');
+        return;
+      }
+      setNotice('Draf PRD berhasil dibuat. Review, edit bila perlu, lalu setujui.');
+      await loadArtifacts();
+    } catch (err) {
+      console.error('Failed to draft PRD:', err);
+      setError('Gagal membuat draf PRD. Silakan coba lagi.');
+    } finally {
+      setGenerating(false);
+    }
+  };
+
+  const handleSaveDraft = async () => {
+    if (!prdId) return;
+    setError('');
+    setNotice('');
+    setBusy(true);
+    try {
+      const res = await fetch(`/api/artifacts/${prdId}`, {
+        method: 'PATCH',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ content: prdContent }),
+      });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Gagal menyimpan draft.');
+        return;
+      }
+      setNotice('Draft PRD tersimpan.');
+      await loadArtifacts();
+    } catch (err) {
+      console.error('Failed to save draft:', err);
+      setError('Gagal menyimpan draft.');
+    } finally {
+      setBusy(false);
+    }
+  };
+
+  const handleApprove = async () => {
+    if (!prdId) return;
+    setError('');
+    setNotice('');
+    setBusy(true);
+    try {
+      const res = await fetch(`/api/artifacts/${prdId}/approve`, { method: 'POST' });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Gagal menyetujui PRD.');
+        return;
+      }
+      setNotice('PRD disetujui — tahap Planning selesai. ✅');
+      await loadArtifacts();
+    } catch (err) {
+      console.error('Failed to approve:', err);
+      setError('Gagal menyetujui PRD.');
+    } finally {
+      setBusy(false);
+    }
+  };
+
+  const extractQuestions = (content: string): string[] => {
+    const match = content.match(/## Pertanyaan Kritis Belum Terjawab\n([\s\S]*)$/);
+    if (!match) return [];
+    return match[1]
+      .split('\n')
+      .map((l) => l.trim().replace(/^- /, ''))
+      .filter((l) => l.length > 0 && l !== '(Tidak ada — semua asumsi kunci sudah tertutup oleh brief.)');
+  };
+
+  if (notFound) {
+    return (
+      <div className="flex-1 overflow-y-auto bg-[#0b141a] flex items-center justify-center">
+        <div className="text-center">
+          <p className="text-[#8696a0] mb-4">Proyek tidak ditemukan.</p>
+          <Link href="/dashboard" className="text-[#00a884] hover:underline text-sm">
+            ← Kembali ke daftar proyek
+          </Link>
+        </div>
+      </div>
+    );
+  }
+
+  const questions = extractQuestions(prdContent);
+
+  return (
+    <div className="flex-1 overflow-y-auto bg-[#0b141a]">
+      <div className="max-w-3xl mx-auto px-6 py-8">
+        {/* Header */}
+        <Link
+          href="/dashboard"
+          className="inline-flex items-center gap-1 text-[#8696a0] hover:text-[#00a884] text-sm mb-4"
+        >
+          <ArrowLeft size={15} /> Daftar proyek
+        </Link>
+        <div className="flex items-center gap-3 mb-2">
+          <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center">
+            <FileText className="text-[#00a884]" size={22} />
+          </div>
+          <div>
+            <h1 className="text-xl font-bold text-[#e9edef]">
+              {project ? project.name : 'Memuat…'}
+            </h1>
+            <p className="text-sm text-[#8696a0]">Wizard Planning — dari brief ke PRD</p>
+          </div>
+        </div>
+        {project?.description && (
+          <p className="text-sm text-[#8696a0] mb-6 whitespace-pre-wrap">{project.description}</p>
+        )}
+
+        {error && (
+          <div className="bg-[#3b1d22] border border-[#f15c6d]/40 text-[#f15c6d] text-xs rounded-lg px-3 py-2 mb-4">
+            {error}
+          </div>
+        )}
+        {notice && (
+          <div className="bg-[#0f2e26] border border-[#00a884]/40 text-[#00a884] text-xs rounded-lg px-3 py-2 mb-4">
+            {notice}
+          </div>
+        )}
+
+        {/* Step 1: Brief */}
+        <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
+          <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
+            <StickyNote size={18} className="text-[#00a884]" />
+            <span className="font-medium text-sm">Langkah 1 — Tulis Brief</span>
+            {artifacts.some((a) => a.type === 'brief') && (
+              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-[#2a3942] text-[#667781] border-[#2f3b43]">
+                tersimpan
+              </span>
+            )}
+          </div>
+          <textarea
+            value={brief}
+            onChange={(e) => setBrief(e.target.value)}
+            placeholder="Tulis brief: apa yang ingin dibangun, untuk siapa, fitur apa saja yang kamu bayangkan…"
+            rows={6}
+            maxLength={8000}
+            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-[#00a884] resize-y"
+          />
+          <div className="flex items-center justify-between mt-2">
+            <span className="text-[11px] text-[#667781]">{brief.length}/8.000 karakter</span>
+            <button
+              onClick={handleDraftPrd}
+              disabled={!brief.trim() || generating || prdStatus === 'approved'}
+              title={
+                prdStatus === 'approved'
+                  ? 'PRD sudah disetujui — tidak bisa membuat draf baru'
+                  : 'Minta AI menyusun draf PRD dari brief'
+              }
+              className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
+            >
+              <Sparkles size={15} />
+              {generating ? 'Menyusun draf…' : prdContent ? 'Draf Ulang PRD' : 'Draf PRD dengan AI'}
+            </button>
+          </div>
+          {prdStatus === 'approved' && (
+            <p className="text-[11px] text-[#f5c33b] mt-2">
+              PRD sudah disetujui — draf baru dikunci (409) agar status tidak jadi zombie.
+            </p>
+          )}
+        </section>
+
+        {/* Step 2: PRD draft */}
+        {prdContent && (
+          <section className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]">
+            <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
+              <FileText size={18} className="text-[#00a884]" />
+              <span className="font-medium text-sm">Langkah 2 — Review & Edit Draf PRD</span>
+              <span
+                className={`text-[10px] px-1.5 py-0.5 rounded border ${
+                  prdStatus === 'approved'
+                    ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
+                    : 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40'
+                }`}
+              >
+                {prdStatus === 'approved' ? 'disetujui' : 'draft'}
+              </span>
+            </div>
+            <textarea
+              value={prdContent}
+              onChange={(e) => setPrdContent(e.target.value)}
+              readOnly={prdStatus === 'approved'}
+              rows={20}
+              className="w-full bg-[#111b21] text-[#e9edef] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-[#00a884] resize-y leading-relaxed"
+            />
+
+            {/* Pertanyaan kritis — blok menonjol, bukan catatan kaki */}
+            {questions.length > 0 && (
+              <div className="mt-3 bg-[#f5c33b]/10 border border-[#f5c33b]/40 rounded-lg p-3">
+                <div className="flex items-center gap-2 text-[#f5c33b] text-sm font-medium mb-2">
+                  <HelpCircle size={16} />
+                  Pertanyaan Kritis Belum Terjawab ({questions.length})
+                </div>
+                <ul className="list-disc list-inside text-[#e9edef] text-xs space-y-1">
+                  {questions.map((q, i) => (
+                    <li key={i}>{q}</li>
+                  ))}
+                </ul>
+              </div>
+            )}
+
+            <div className="flex flex-wrap gap-2 mt-4">
+              <button
+                onClick={handleSaveDraft}
+                disabled={busy || prdStatus === 'approved' || generating || !prdContent.trim()}
+                className="inline-flex items-center gap-2 bg-[#2a3942] hover:bg-[#334550] disabled:opacity-40 disabled:cursor-not-allowed text-[#e9edef] text-xs font-medium px-3 py-2 rounded-lg transition-colors"
+              >
+                <Save size={14} /> Simpan Draft
+              </button>
+              <button
+                onClick={handleApprove}
+                disabled={busy || generating || prdStatus === 'approved' || !prdContent.trim()}
+                title={generating ? 'Tunggu draf selesai — cegah menyetujui konten basi' : 'Setujui PRD'}
+                className="inline-flex items-center gap-2 bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
+              >
+                <CheckCircle2 size={14} /> Setujui PRD
+              </button>
+            </div>
+          </section>
+        )}
+
+        {/* Artefak proyek */}
+        {artifacts.length > 0 && (
+          <section className="bg-[#202c33] rounded-xl p-4 border border-[#2f3b43]">
+            <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
+              <FileText size={18} className="text-[#8696a0]" />
+              <span className="font-medium text-sm">Artefak Proyek</span>
+            </div>
+            <ul className="space-y-2">
+              {artifacts.map((a) => (
+                <li
+                  key={a.id}
+                  className="flex items-center justify-between text-xs text-[#e9edef] bg-[#2a3942] rounded-lg px-3 py-2"
+                >
+                  <span>
+                    <span className="font-medium">{a.type === 'brief' ? 'Brief' : a.type.toUpperCase()}</span>
+                    <span className="text-[#667781]"> · tahap {a.stage}</span>
+                  </span>
+                  <span
+                    className={`text-[10px] px-1.5 py-0.5 rounded border ${
+                      a.status === 'approved'
+                        ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40'
+                        : 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40'
+                    }`}
+                  >
+                    {a.status}
+                  </span>
+                </li>
+              ))}
+            </ul>
+          </section>
+        )}
+      </div>
+    </div>
+  );
+}
diff --git a/src/app/dashboard/page.tsx b/src/app/dashboard/page.tsx
index ea690c9..4a521c7 100644
--- a/src/app/dashboard/page.tsx
+++ b/src/app/dashboard/page.tsx
@@ -1,6 +1,7 @@
 'use client';
 
 import React, { useState, useEffect, useCallback } from 'react';
+import Link from 'next/link';
 import { FolderPlus, Pencil, Trash2, Check, X, LayoutDashboard } from 'lucide-react';
 import { Project, StageName, StageStatusValue, ProjectStageStatuses } from '@/types';
 
@@ -286,7 +287,9 @@ export default function DashboardPage() {
                   className="bg-[#202c33] hover:bg-[#233138] transition-colors rounded-xl p-4 border border-[#2f3b43] flex items-start justify-between gap-3"
                 >
                   <div className="min-w-0">
-                    <h3 className="text-[#e9edef] font-medium text-sm truncate">{p.name}</h3>
+                    <Link href={`/dashboard/${p.id}`} className="hover:underline">
+                      <h3 className="text-[#e9edef] font-medium text-sm truncate">{p.name}</h3>
+                    </Link>
                     {p.description && (
                       <p className="text-[#8696a0] text-xs mt-1 whitespace-pre-wrap">{p.description}</p>
                     )}
diff --git a/src/lib/ai/prd-prompt.ts b/src/lib/ai/prd-prompt.ts
new file mode 100644
index 0000000..6c0da92
--- /dev/null
+++ b/src/lib/ai/prd-prompt.ts
@@ -0,0 +1,83 @@
+import { AIMessage } from './types';
+
+/**
+ * System prompt drafter PRD untuk wizard Planning (Story 3 Meja Kendali).
+ *
+ * Kualitas draf wajib (hasil elicitation + party-mode review):
+ * 1. Bagian `## Cakupan Fitur dari Brief` — menaftar SETIAP fitur yang
+ *    teridentifikasi dari brief, sehingga reviewer bisa mencocokkan
+ *    brief ↔ PRD secara visual (bukan draf generik).
+ * 2. Daftar pertanyaan kritis yang belum dijawab user — bagian yang
+ *    mengubah "draf yang bisa disetujui" menjadi "draf yang layak dipertanyakan".
+ */
+
+export const PRD_SYSTEM_PROMPT = `Kamu adalah drafter PRD (Product Requirements Document) untuk vibecoder non-IT.
+Tugas: mengubah brief mentah dari user menjadi draf PRD berbahasa Indonesia yang terstruktur.
+
+ATURAN WAJIB (jangan dilanggar):
+1. Buka bagian "## Cakupan Fitur dari Brief" di awal PRD: daftar poin berisi SETIAP fitur/kemampuan yang tersirat maupun tersurat disebut dalam brief. Jangan melewatkan satu pun — jika brief menyebut fitur secara samar, masukkan dengan tanda (perlu klarifikasi).
+2. Buat bagian "## Pertanyaan Kritis Belum Terjawab": daftar pertanyaan spesifik yang jawabannya mengubah desain (pengguna, biaya, data sensitif, integrasi, skala). Kosong HANYA jika benar-benar tidak ada yang menggantung.
+3. Isi bagian standar PRD: Latar Belakang, Tujuan, Pengguna, Fitur (rinci per fitur), Di Luar Cakupan (non-goals), Kriteria Berhasil.
+4. Jangan mengarang fitur yang tidak disebut brief — itu masuk pertanyaan kritis, bukan PRD.
+5. Bahasa Indonesia, markdown, ringkas dan konkret.
+
+FORMAT RESPON: balas HANYA JSON valid tanpa pembungkus markdown fence, dengan bentuk:
+{"prd_markdown": "<isi PRD lengkap dalam markdown>", "open_questions": ["pertanyaan 1", "pertanyaan 2"]}`;
+
+export interface PrdAiResponse {
+  prd_markdown: string;
+  open_questions: string[];
+}
+
+/**
+ * Parse & harden respons AI: strip code fence markdown, validasi field.
+ * Throw Error dengan pesan ramah-user bila tidak valid — pemanggil route
+ * mengubahnya menjadi 502 tanpa menyimpan artifact.
+ */
+export function parsePrdResponse(rawText: string): PrdAiResponse {
+  let text = (rawText || '').trim();
+
+  // Strip code fence: AI kadang membungkus JSON dalam ```json ... ```
+  const fenceMatch = text.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
+  if (fenceMatch) {
+    text = fenceMatch[1].trim();
+  }
+
+  let parsed: unknown;
+  try {
+    parsed = JSON.parse(text);
+  } catch {
+    throw new Error('Draf AI tidak valid (bukan JSON). Silakan coba lagi.');
+  }
+
+  const obj = parsed as Record<string, unknown>;
+  const prd = typeof obj.prd_markdown === 'string' ? obj.prd_markdown.trim() : '';
+  const questions = Array.isArray(obj.open_questions)
+    ? obj.open_questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
+    : null;
+
+  if (!prd) {
+    throw new Error('Draf AI kosong. Silakan coba lagi.');
+  }
+  if (!questions) {
+    throw new Error('Draf AI tidak valid (daftar pertanyaan kritis hilang). Silakan coba lagi.');
+  }
+
+  return { prd_markdown: prd, open_questions: questions };
+}
+
+/**
+ * Gabungkan hasil AI menjadi satu konten markdown artifact:
+ * pertanyaan kritis sebagai blok tersendiri di akhir — bukan catatan kaki.
+ */
+export function composePrdContent(ai: PrdAiResponse): string {
+  const questionBlock =
+    ai.open_questions.length > 0
+      ? `\n\n## Pertanyaan Kritis Belum Terjawab\n\n${ai.open_questions.map((q) => `- ${q}`).join('\n')}`
+      : '\n\n## Pertanyaan Kritis Belum Terjawab\n\n- (Tidak ada — semua asumsi kunci sudah tertutup oleh brief.)';
+  return ai.prd_markdown.trimEnd() + questionBlock;
+}
+
+export function buildPrdMessages(brief: string): AIMessage[] {
+  return [{ role: 'user', content: `Berikut brief saya:\n\n${brief}\n\nSusun draf PRD sesuai aturan system prompt.` }];
+}
diff --git a/src/lib/db/index.ts b/src/lib/db/index.ts
index c6a0ebb..1e6831f 100644
--- a/src/lib/db/index.ts
+++ b/src/lib/db/index.ts
@@ -1,7 +1,7 @@
 import { createClient } from '@libsql/client';
 import path from 'path';
 import fs from 'fs';
-import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project, StageName, StageStatusValue, ProjectStageStatuses } from '@/types';
+import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project, StageName, StageStatusValue, ProjectStageStatuses, Artifact, ArtifactStage, ArtifactType, ArtifactStatus } from '@/types';
 
 const DB_DIR = path.join(process.cwd(), 'data');
 if (!fs.existsSync(DB_DIR)) {
@@ -648,4 +648,136 @@ export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
   return res.rowsAffected > 0;
 }
 
+// =============================================================================
+// Artifacts (Meja Kendali) — CRUD untuk wizard tahapan
+// Kontrak skema: architecture-diagrams.md (tabel `artifact`).
+// DISIPLIN updated_at: semua path tulis (kecuali approve-ulang) set eksplisit
+// strftime('%Y-%m-%d %H:%M:%f','now') — SQLite tidak punya ON UPDATE.
+// =============================================================================
+
+function mapArtifactRow(row: any): Artifact {
+  return {
+    id: String(row.id),
+    project_id: String(row.project_id),
+    stage: String(row.stage) as ArtifactStage,
+    type: String(row.type) as ArtifactType,
+    status: String(row.status) as ArtifactStatus,
+    content: String(row.content ?? ''),
+    created_at: String(row.created_at),
+    updated_at: String(row.updated_at),
+  };
+}
+
+export async function getArtifactRowByProjectStageType(
+  projectId: string,
+  stage: ArtifactStage,
+  type: ArtifactType
+): Promise<Artifact | null> {
+  const res = await client.execute({
+    sql: `SELECT * FROM artifact WHERE project_id = ? AND stage = ? AND type = ? LIMIT 1`,
+    args: [projectId, stage, type],
+  });
+  return res.rows.length > 0 ? mapArtifactRow(res.rows[0]) : null;
+}
+
+/**
+ * Upsert artifact (brief / PRD): satu artifact per project+stage+type.
+ * Brief selalu status 'draft' (derivasi status planning hanya dari approve PRD).
+ */
+export async function upsertBriefArtifact(
+  projectId: string,
+  content: string,
+  id: string
+): Promise<Artifact> {
+  await ensureDbInitialized();
+  const existing = await getArtifactRowByProjectStageType(projectId, 'planning', 'brief');
+  if (existing) {
+    await client.execute({
+      sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
+      args: [content, existing.id],
+    });
+    return (await getArtifactById(existing.id))!;
+  }
+  await client.execute({
+    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', 'brief', 'draft', ?)`,
+    args: [id, projectId, content],
+  });
+  return (await getArtifactById(id))!;
+}
+
+export async function upsertPrdArtifact(
+  projectId: string,
+  content: string,
+  id: string
+): Promise<Artifact> {
+  await ensureDbInitialized();
+  const existing = await getArtifactRowByProjectStageType(projectId, 'planning', 'prd');
+  if (existing) {
+    await client.execute({
+      sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
+      args: [content, existing.id],
+    });
+    return (await getArtifactById(existing.id))!;
+  }
+  await client.execute({
+    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', 'prd', 'draft', ?)`,
+    args: [id, projectId, content],
+  });
+  return (await getArtifactById(id))!;
+}
+
+export async function getArtifactById(id: string): Promise<Artifact | null> {
+  await ensureDbInitialized();
+  const res = await client.execute({ sql: `SELECT * FROM artifact WHERE id = ?`, args: [id] });
+  return res.rows.length > 0 ? mapArtifactRow(res.rows[0]) : null;
+}
+
+export async function getArtifactsByProject(
+  projectId: string,
+  filter?: { stage?: ArtifactStage; type?: ArtifactType }
+): Promise<Artifact[]> {
+  await ensureDbInitialized();
+  const clauses: string[] = ['project_id = ?'];
+  const args: (string)[] = [projectId];
+  if (filter?.stage) {
+    clauses.push('stage = ?');
+    args.push(filter.stage);
+  }
+  if (filter?.type) {
+    clauses.push('type = ?');
+    args.push(filter.type);
+  }
+  const res = await client.execute({
+    sql: `SELECT * FROM artifact WHERE ${clauses.join(' AND ')} ORDER BY datetime(updated_at) DESC`,
+    args,
+  });
+  return res.rows.map(mapArtifactRow);
+}
+
+export async function updateArtifactContent(id: string, content: string): Promise<Artifact | null> {
+  await ensureDbInitialized();
+  const existing = await getArtifactById(id);
+  if (!existing) return null;
+  await client.execute({
+    sql: `UPDATE artifact SET content = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
+    args: [content, id],
+  });
+  return getArtifactById(id);
+}
+
+export async function approveArtifact(id: string): Promise<Artifact | null> {
+  await ensureDbInitialized();
+  const existing = await getArtifactById(id);
+  if (!existing) return null;
+  if (existing.status === 'approved') {
+    // Approve ulang: no-op aman, updated_at TIDAK diubah (berbohong soal konten)
+    return existing;
+  }
+  await client.execute({
+    sql: `UPDATE artifact SET status = 'approved', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
+    args: [id],
+  });
+  return getArtifactById(id);
+}
+
 export default client;
diff --git a/src/types/index.ts b/src/types/index.ts
index 8cf52b4..8661f0a 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -121,6 +121,32 @@ export type StageStatusValue = 'selesai' | 'draf' | 'belum_dimulai';
 
 export type ProjectStageStatuses = Record<StageName, StageStatusValue>;
 
+export type ArtifactStage = StageName;
+
+export type ArtifactType =
+  | 'brief'
+  | 'prd'
+  | 'spec'
+  | 'story'
+  | 'handoff'
+  | 'design'
+  | 'test-plan'
+  | 'deploy-checklist'
+  | 'retro';
+
+export type ArtifactStatus = 'draft' | 'approved';
+
+export interface Artifact {
+  id: string;
+  project_id: string;
+  stage: ArtifactStage;
+  type: ArtifactType;
+  status: ArtifactStatus;
+  content: string;
+  created_at: string;
+  updated_at: string;
+}
+
 export interface SearchResult {
   id: string;
   title: string;
----- END DIFF -----
