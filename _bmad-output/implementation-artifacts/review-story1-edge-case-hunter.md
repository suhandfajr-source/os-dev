Read the review instructions below completely and follow them as your review instructions.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. If the instruction file is unreadable, report that exact failure and stop. Return your findings as text in your final message.

The claims file (spec) is inlined below AFTER the instructions — per the claims-check step, read it only at Step 5, after your path tracing (Steps 2-3) is finished. The review content (unified diff) is inlined after that.

===== REVIEW INSTRUCTIONS (edge-case-hunter) =====
# Edge Case Hunter Review

**Goal:** You are a pure path tracer. Never comment on whether code is good or bad; only list missing handling.
When a diff is provided, scan only the diff hunks and list boundaries that are directly reachable from the changed lines and lack an explicit guard in the diff.
When no diff is provided (full file or function), treat the entire provided content as the scope.
Ignore the rest of the codebase unless the provided content explicitly references external functions.
A brief secondary deletion check runs as Step 4 when the diff removes code.
A claims check runs as Step 5.

**Inputs:**
- **content** — Content to review, or a path to read it from: diff, full file, or function
- **also_consider** (optional) — Areas to keep in mind during review alongside normal edge-case analysis
- **claims_file** — Path to the spec this change was built from. Do NOT read it before Step 5: the path tracing in Steps 2–3 must finish before the claims are seen.

**MANDATORY: Execute steps in the Execution section IN EXACT ORDER. DO NOT skip steps or change the sequence. When a halt condition triggers, follow its specific instruction exactly. Each action within a step is a REQUIRED action to complete that step.**

**Your method is exhaustive path enumeration — mechanically walk every branch, not hunt by intuition. Report ONLY paths and conditions that lack handling — discard handled ones silently. Do NOT editorialize or add filler. Do not assign severity labels, rankings, or priority levels.**


## EXECUTION

### Step 1: Receive Content

- Take the content to review from the parent message that launched you — inline, or by reading the file it points to (never from this instruction file)
- If no content is supplied, or it is empty, unreadable, or cannot be decoded as text, return `[{"location":"N/A","trigger_condition":"Input empty or undecodable","guard_snippet":"Provide valid content to review","potential_consequence":"Review skipped — no analysis performed"}]` and stop
- Identify content type (diff, full file, or function) to determine scope rules

### Step 2: Exhaustive Path Analysis

**Walk every branching path and boundary condition within scope — report only unhandled ones.**

- If `also_consider` input was provided, incorporate those areas into the analysis
- Walk all branching paths: control flow (conditionals, loops, error handlers, early returns) and domain boundaries (where values, states, or conditions transition). Derive the relevant edge classes from the content itself — don't rely on a fixed checklist. Examples: missing else/default, unguarded inputs, off-by-one loops, arithmetic overflow, implicit type coercion, race conditions, timeout gaps
- Consider implicit branches: the diff special-cases or changes the handling of one or more members of a fixed set of values — enums, status codes, sentinels, type tags, flags, value ranges. The rest of the set is implicit branches (e.g. the diff changes the `RED` and `YELLOW` cases of a `RED`/`YELLOW`/`GREEN` enum; `GREEN` is the implicit branch)
- Consider handle lifetime: when the changed code re-checks, re-fetches, or re-validates something it already held — a handle, index, id, pointer — the re-check exists because an intervening call can invalidate it. Identify that call, what it does to the thing held, and what the changed code silently skips when the re-check fails
- For each call site the diff adds or changes — in test files as well as production code — read the callee's declaration and check the call against it: argument count, order, types, and defaults. Report any mismatch
- For each path: determine whether the content handles it
- Collect only the unhandled paths as findings — discard handled ones silently

### Step 3: Validate Completeness

- Revisit every edge class from Step 2 — e.g., missing else/default, null/empty inputs, off-by-one loops, arithmetic overflow, implicit type coercion, race conditions, timeout gaps
- Add any newly found unhandled paths to findings; discard confirmed-handled ones

### Step 4: Deletion Check

If the diff removed or replaced meaningful code (ignore pure renames and whitespace): load `references/deletion-check.md` and follow it.

### Step 5: Claims Check

Load `references/claims-check.md` and follow it.

### Step 6: Present Findings

Output all findings as a single JSON array following the Output Format specification exactly.


## OUTPUT FORMAT

Return ONLY a valid JSON array of objects. Each edge-case finding contains exactly these four fields:

```json
[{
  "location": "file:start-end (or file:line when single line, or file:hunk when exact line unavailable)",
  "trigger_condition": "one-line description (max 15 words)",
  "guard_snippet": "minimal code sketch that closes the gap (single-line escaped string, no raw newlines or unescaped quotes)",
  "potential_consequence": "what could actually go wrong (max 15 words)"
}]
```

No extra text, no explanations, no markdown wrapping. An empty array `[]` is valid when nothing is found. Deletion findings from Step 4 and claim findings from Step 5, if any, go in the same array with the extra fields defined in `references/deletion-check.md` and `references/claims-check.md`.


## HALT CONDITIONS

- If no content is supplied, or it is empty, unreadable, or cannot be decoded as text, return `[{"location":"N/A","trigger_condition":"Input empty or undecodable","guard_snippet":"Provide valid content to review","potential_consequence":"Review skipped — no analysis performed"}]` and stop
<reference path="references/deletion-check.md">
# Deletion Check

Secondary pass for the Edge Case Hunter — runs only when the diff removed meaningful code. Subordinate to the edge-case pass; findings are usually few or none.

For each chunk of removed or replaced code (ignore pure renames and whitespace), ask: did it carry behavior or a contract that the change neither re-established nor intentionally retired? Add a finding for any resulting regression, orphaned reference, or newly-dead code. Skip anything already covered by your edge-case findings.

Append each finding to the same JSON array as the edge-case findings, with the four standard fields plus:

- `kind`: `"deletion"`
- `confidence`: `"high"`, `"medium"`, or `"low"` — these are inferences; rate them

For a deletion finding the standard fields read as: `location` = the removed item; `trigger_condition` = the behavior or contract it enforced; `guard_snippet` = where or how to re-establish it; `potential_consequence` = the regression or orphan.

Add nothing if nothing qualifies.
</reference>
<reference path="references/claims-check.md">
# Claims Check

Final pass for the Edge Case Hunter. Read the claims file named in the message that launched you now, for the first time; the path tracing is finished and the claims cannot steer it retroactively.

It is the spec the change was built from. Read only its `## Intent` and `## Tasks & Acceptance` sections — the claims live there; ignore the rest of the file. The spec is the change's own account of itself: testimony, not evidence — a claim repeated in a code comment is still the same claim, not confirmation. Extract each checkable claim — what the change does, what it preserves, ordering, arithmetic, and parity with existing code ("exactly as X does") — then try to falsify each one against the code you have already traced. Where your trace is not enough to decide, read the code that decides it: the compared-to function, the actual callee, the state the claim assumes.

Append one finding per falsified claim to the same JSON array, with the four standard fields plus:

- `kind`: `"claim"`
- `confidence`: `"high"`, `"medium"`, or `"low"`

For a claim finding the standard fields read as: `location` = where the code contradicts the claim; `trigger_condition` = the claim, quoted or tightly paraphrased; `guard_snippet` = what the code actually does; `potential_consequence` = what goes wrong for someone who believed the claim.

Verified claims produce nothing. Add nothing if nothing is falsified.
</reference>

## CONTENT SOURCE

"Review content:" in the message that launched you gives the content itself or a path to read it from. Read the file when it is a path; either way that is the content under review, and this instruction file never is.

===== CLAIMS FILE (spec) — read only at Step 5 =====
---
title: 'Fondasi Proyek — entitas, API, dan daftar proyek'
type: 'feature'
created: '2026-09-13'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '79628ac8258e028bc9029f2a171b989916207dc4'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Dashboard mode Meja Kendali belum ada sama sekali — tidak ada tempat membuat dan melihat daftar proyek sebagai entitas utama asisten SDLC (CAP-2 dari SPEC Meja Kendali). Rilis R1 lain (mesin status, wizard) semuanya bergantung pada keberadaan entitas `project`.

**Approach:** Tambah tabel `projects` di SQLite mengikuti pola DB existing, fungsi CRUD di `src/lib/db/index.ts`, API REST di `/api/projects` mengikuti pola API existing, dan halaman `/dashboard` yang menampilkan daftar proyek dengan pola UI aplikasi (fokus backend; UI cukup fungsional).

## Boundaries & Constraints

**Always:**
- Ikuti pola existing: libsql client + `ensureDbInitialized` (CREATE TABLE IF NOT EXISTS) di `src/lib/db/index.ts`; API route Next.js app router dengan `NextResponse` dan pesan error bahasa Indonesia; typed interfaces di `src/types/index.ts`.
- UI Dashboard dibuat sebagai client component dengan `fetch`, konsisten dengan gaya komponen existing (Tailwind, pola state `useState`/`useEffect`).
- Setiap operasi tulis memperbarui `updated_at`.

**Never:**
- Jangan mengintroduksi ORM/library baru (constraint SPEC: stack existing).
- Jangan mengubah perilaku atau tampilan WhatsApp mode existing (`/`, `/chat`).
- Jangan membangun mesin status tahapan, wizard, atau artefak — itu story 2, 4, 5.
- Tanpa auth/role (personal tool single-user).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Buat proyek | POST `/api/projects` `{name, description?}` | 201 `{project}` lengkap dengan id, timestamps | `name` kosong/hanya spasi → 400 `{error}` |
| Daftar proyek | GET `/api/projects` | 200 `{projects: [...]}` urut `updated_at` DESC | DB gagal → 500 `{error}` |
| Detail proyek | GET `/api/projects/[id]` | 200 `{project}` | id tidak ada → 404 |
| Update proyek | PATCH `/api/projects/[id]` `{name?, description?}` | 200 `{project}` dengan `updated_at` baru | id tidak ada → 404; body tidak ada field valid → 400 |
| Hapus proyek | DELETE `/api/projects/[id]` | 200 `{ok: true}` | id tidak ada → 404 |

</frozen-after-approval>

## Code Map

- `src/lib/db/index.ts` -- lapisan data; tambah blok CREATE TABLE `projects` di `ensureDbInitialized` + fungsi CRUD; pola contoh: `createConversation`, `listConversations`, `deleteConversation`.
- `_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md` -- kontrak skema data inti R1; kolom `projects` WAJIB persis: `id, name, description, created_at, updated_at`; tabel `artifact`/`story`/`changelog` dibuat di story berikutnya, bukan di sini.
- `src/types/index.ts` -- kontrak tipe; tambah `interface Project` (pola: `Conversation` di baris 94).
- `src/app/api/conversations/route.ts` -- pola untuk `src/app/api/projects/route.ts` (GET list + POST create, `runtime = 'nodejs'`, id via `crypto.randomUUID()`).
- `src/app/api/conversations/[id]/route.ts` -- pola untuk `src/app/api/projects/[id]/route.ts` (GET/PATCH/DELETE + 404).
- `src/app/page.tsx`, `src/components/chat/*` -- WhatsApp mode existing; JANGAN diubah.
- `src/app/dashboard/page.tsx` -- BARU: halaman daftar proyek (form buat + kartu daftar + aksi edit/hapus).

## Tasks & Acceptance

**Execution:**
- [ ] `src/types/index.ts` -- tambah `interface Project { id, name, description, created_at, updated_at }` -- kontrak tipe dipakai DB & API.
- [ ] `src/lib/db/index.ts` -- tabel `projects` + fungsi `createProject`, `listProjects`, `getProjectById`, `updateProject`, `deleteProject` -- lapisan data mengikuti pola existing.
- [ ] `src/app/api/projects/route.ts` -- GET (list) + POST (create) -- API koleksi.
- [ ] `src/app/api/projects/[id]/route.ts` -- GET + PATCH + DELETE -- API item.
- [ ] `src/app/dashboard/page.tsx` -- halaman daftar proyek: form buat proyek, kartu daftar (nama + deskripsi + timestamps), aksi edit & hapus -- meja kendali tahap paling awal.

**Acceptance Criteria:**
- Given aplikasi jalan, when membuka `/dashboard`, then tampil daftar proyek (kosong di awal) beserta form membuat proyek.
- Given form diisi nama valid, when disubmit, then proyek baru muncul di daftar dan tetap ada setelah reload (persisten di `assistant.db`).
- Given proyek ada, when nama/deskripsi diubah lalu disimpan, then perubahan tampil dan `updated_at` memindahkan posisinya di urutan daftar.
- Given proyek ada, when dihapus, then hilang dari daftar dan GET berikutnya mengembalikan 404.
- Given WhatsApp mode dipakai normal (chat, kamus, simpan tools), then perilakunya tidak berubah sama sekali.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

**Commands:**
- `npm run lint` -- expected: tanpa error baru.
- `curl -s http://localhost:3000/api/projects | head` -- expected: `{"projects":[...]}` setelah tabel terbuat.

**Manual checks:**
- Buka `/dashboard`: buat proyek → muncul di daftar; edit → berubah + naik urutan; hapus → hilang; reload → data persisten.
- Buka `/` dan satu `/chat/[id]`: WhatsApp mode berperilaku normal.

===== REVIEW CONTENT (unified diff) =====
----- BEGIN DIFF -----
diff --git a/src/app/api/projects/[id]/route.ts b/src/app/api/projects/[id]/route.ts
new file mode 100644
index 0000000..1905bbe
--- /dev/null
+++ b/src/app/api/projects/[id]/route.ts
@@ -0,0 +1,66 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { getProjectById, updateProject, deleteProject } from '@/lib/db';
+
+export const runtime = 'nodejs';
+
+type RouteContext = { params: Promise<{ id: string }> };
+
+export async function GET(_req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const project = await getProjectById(id);
+    if (!project) {
+      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ project });
+  } catch (err: any) {
+    console.error('Error fetching project:', err);
+    return NextResponse.json({ error: 'Gagal memuat proyek.' }, { status: 500 });
+  }
+}
+
+export async function PATCH(req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const body = await req.json().catch(() => ({}));
+    const fields: { name?: string; description?: string } = {};
+
+    if (typeof body.name === 'string') {
+      const name = body.name.trim();
+      if (!name) {
+        return NextResponse.json({ error: 'Nama proyek wajib diisi.' }, { status: 400 });
+      }
+      fields.name = name;
+    }
+    if (typeof body.description === 'string') {
+      fields.description = body.description.trim();
+    }
+
+    if (Object.keys(fields).length === 0) {
+      return NextResponse.json({ error: 'Tidak ada field yang valid untuk diperbarui.' }, { status: 400 });
+    }
+
+    const project = await updateProject(id, fields);
+    if (!project) {
+      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ project });
+  } catch (err: any) {
+    console.error('Error updating project:', err);
+    return NextResponse.json({ error: 'Gagal memperbarui proyek.' }, { status: 500 });
+  }
+}
+
+export async function DELETE(_req: NextRequest, ctx: RouteContext) {
+  try {
+    const { id } = await ctx.params;
+    const deleted = await deleteProject(id);
+    if (!deleted) {
+      return NextResponse.json({ error: 'Proyek tidak ditemukan.' }, { status: 404 });
+    }
+    return NextResponse.json({ ok: true });
+  } catch (err: any) {
+    console.error('Error deleting project:', err);
+    return NextResponse.json({ error: 'Gagal menghapus proyek.' }, { status: 500 });
+  }
+}
diff --git a/src/app/api/projects/route.ts b/src/app/api/projects/route.ts
new file mode 100644
index 0000000..b4a92c3
--- /dev/null
+++ b/src/app/api/projects/route.ts
@@ -0,0 +1,34 @@
+import { NextRequest, NextResponse } from 'next/server';
+import { listProjects, createProject } from '@/lib/db';
+import crypto from 'crypto';
+
+export const runtime = 'nodejs';
+
+export async function GET() {
+  try {
+    const projects = await listProjects();
+    return NextResponse.json({ projects });
+  } catch (err: any) {
+    console.error('Error fetching projects:', err);
+    return NextResponse.json({ error: 'Gagal memuat daftar proyek.' }, { status: 500 });
+  }
+}
+
+export async function POST(req: NextRequest) {
+  try {
+    const body = await req.json().catch(() => ({}));
+    const name = typeof body.name === 'string' ? body.name.trim() : '';
+    const description = typeof body.description === 'string' ? body.description.trim() : '';
+
+    if (!name) {
+      return NextResponse.json({ error: 'Nama proyek wajib diisi.' }, { status: 400 });
+    }
+
+    const id = body.id || crypto.randomUUID();
+    const project = await createProject(id, name, description);
+    return NextResponse.json({ project }, { status: 201 });
+  } catch (err: any) {
+    console.error('Error creating project:', err);
+    return NextResponse.json({ error: 'Gagal membuat proyek baru.' }, { status: 500 });
+  }
+}
diff --git a/src/app/dashboard/page.tsx b/src/app/dashboard/page.tsx
new file mode 100644
index 0000000..e552ea1
--- /dev/null
+++ b/src/app/dashboard/page.tsx
@@ -0,0 +1,243 @@
+'use client';
+
+import React, { useState, useEffect, useCallback } from 'react';
+import { FolderPlus, Pencil, Trash2, Check, X, LayoutDashboard } from 'lucide-react';
+import { Project } from '@/types';
+
+export default function DashboardPage() {
+  const [projects, setProjects] = useState<Project[]>([]);
+  const [newName, setNewName] = useState('');
+  const [newDescription, setNewDescription] = useState('');
+  const [error, setError] = useState('');
+  const [editingId, setEditingId] = useState<string | null>(null);
+  const [editName, setEditName] = useState('');
+  const [editDescription, setEditDescription] = useState('');
+  const [loading, setLoading] = useState(true);
+
+  const fetchProjects = useCallback(async () => {
+    try {
+      const res = await fetch('/api/projects');
+      if (res.ok) {
+        const data = await res.json();
+        setProjects(data.projects || []);
+      }
+    } catch (err) {
+      console.error('Failed to fetch projects:', err);
+    } finally {
+      setLoading(false);
+    }
+  }, []);
+
+  useEffect(() => {
+    fetchProjects();
+  }, [fetchProjects]);
+
+  const handleCreate = async (e: React.FormEvent) => {
+    e.preventDefault();
+    setError('');
+    try {
+      const res = await fetch('/api/projects', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ name: newName, description: newDescription }),
+      });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Gagal membuat proyek.');
+        return;
+      }
+      setProjects((prev) => [data.project, ...prev]);
+      setNewName('');
+      setNewDescription('');
+    } catch (err) {
+      console.error('Failed to create project:', err);
+      setError('Gagal membuat proyek.');
+    }
+  };
+
+  const startEdit = (p: Project) => {
+    setEditingId(p.id);
+    setEditName(p.name);
+    setEditDescription(p.description);
+  };
+
+  const cancelEdit = () => setEditingId(null);
+
+  const handleUpdate = async (id: string) => {
+    try {
+      const res = await fetch(`/api/projects/${id}`, {
+        method: 'PATCH',
+        headers: { 'Content-Type': 'application/json' },
+        body: JSON.stringify({ name: editName, description: editDescription }),
+      });
+      const data = await res.json();
+      if (!res.ok) {
+        setError(data.error || 'Gagal memperbarui proyek.');
+        return;
+      }
+      setProjects((prev) => prev.map((p) => (p.id === id ? data.project : p)));
+      cancelEdit();
+    } catch (err) {
+      console.error('Failed to update project:', err);
+      setError('Gagal memperbarui proyek.');
+    }
+  };
+
+  const handleDelete = async (id: string) => {
+    try {
+      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
+      if (!res.ok) {
+        const data = await res.json();
+        setError(data.error || 'Gagal menghapus proyek.');
+        return;
+      }
+      setProjects((prev) => prev.filter((p) => p.id !== id));
+    } catch (err) {
+      console.error('Failed to delete project:', err);
+      setError('Gagal menghapus proyek.');
+    }
+  };
+
+  const formatTimestamp = (ts: string) => {
+    try {
+      return new Date(ts.replace(' ', 'T')).toLocaleString('id-ID', {
+        day: 'numeric',
+        month: 'short',
+        year: 'numeric',
+        hour: '2-digit',
+        minute: '2-digit',
+      });
+    } catch {
+      return ts;
+    }
+  };
+
+  return (
+    <div className="flex-1 overflow-y-auto bg-[#0b141a]">
+      <div className="max-w-3xl mx-auto px-6 py-8">
+        {/* Header */}
+        <div className="flex items-center gap-3 mb-6">
+          <div className="w-10 h-10 rounded-lg bg-[#00a884]/20 flex items-center justify-center">
+            <LayoutDashboard className="text-[#00a884]" size={22} />
+          </div>
+          <div>
+            <h1 className="text-xl font-bold text-[#e9edef]">Meja Kendali</h1>
+            <p className="text-sm text-[#8696a0]">
+              Daftar proyek — asisten SDLC dari Planning sampai Maintenance
+            </p>
+          </div>
+        </div>
+
+        {/* Create form */}
+        <form
+          onSubmit={handleCreate}
+          className="bg-[#202c33] rounded-xl p-4 mb-6 border border-[#2f3b43]"
+        >
+          <div className="flex items-center gap-2 mb-3 text-[#e9edef]">
+            <FolderPlus size={18} className="text-[#00a884]" />
+            <span className="font-medium text-sm">Proyek Baru</span>
+          </div>
+          <input
+            type="text"
+            value={newName}
+            onChange={(e) => setNewName(e.target.value)}
+            placeholder="Nama proyek (wajib)"
+            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-1 focus:ring-[#00a884]"
+          />
+          <textarea
+            value={newDescription}
+            onChange={(e) => setNewDescription(e.target.value)}
+            placeholder="Deskripsi singkat (opsional)"
+            rows={2}
+            className="w-full bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-[#00a884] resize-none"
+          />
+          {error && <p className="text-[#f15c6d] text-xs mb-2">{error}</p>}
+          <button
+            type="submit"
+            disabled={!newName.trim()}
+            className="bg-[#00a884] hover:bg-[#008f72] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
+          >
+            Buat Proyek
+          </button>
+        </form>
+
+        {/* Project list */}
+        {loading ? (
+          <p className="text-center text-[#8696a0] text-sm py-8">Memuat…</p>
+        ) : projects.length === 0 ? (
+          <div className="text-center text-[#8696a0] text-sm py-12">
+            Belum ada proyek. Buat proyek pertamamu di atas — satu proyek = satu meja kendali.
+          </div>
+        ) : (
+          <div className="space-y-3">
+            {projects.map((p) =>
+              editingId === p.id ? (
+                /* Edit mode */
+                <div key={p.id} className="bg-[#202c33] rounded-xl p-4 border border-[#00a884]/50">
+                  <input
+                    type="text"
+                    value={editName}
+                    onChange={(e) => setEditName(e.target.value)}
+                    className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-3 py-2 text-sm mb-2 outline-none focus:ring-1 focus:ring-[#00a884]"
+                  />
+                  <textarea
+                    value={editDescription}
+                    onChange={(e) => setEditDescription(e.target.value)}
+                    rows={2}
+                    className="w-full bg-[#2a3942] text-[#e9edef] rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-1 focus:ring-[#00a884] resize-none"
+                  />
+                  <div className="flex gap-2">
+                    <button
+                      onClick={() => handleUpdate(p.id)}
+                      className="bg-[#00a884] hover:bg-[#008f72] text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
+                    >
+                      <Check size={14} /> Simpan
+                    </button>
+                    <button
+                      onClick={cancelEdit}
+                      className="bg-[#2a3942] hover:bg-[#334550] text-[#e9edef] text-xs px-3 py-1.5 rounded-lg flex items-center gap-1"
+                    >
+                      <X size={14} /> Batal
+                    </button>
+                  </div>
+                </div>
+              ) : (
+                /* Project card */
+                <div
+                  key={p.id}
+                  className="bg-[#202c33] hover:bg-[#233138] transition-colors rounded-xl p-4 border border-[#2f3b43] flex items-start justify-between gap-3"
+                >
+                  <div className="min-w-0">
+                    <h3 className="text-[#e9edef] font-medium text-sm truncate">{p.name}</h3>
+                    {p.description && (
+                      <p className="text-[#8696a0] text-xs mt-1 whitespace-pre-wrap">{p.description}</p>
+                    )}
+                    <p className="text-[#667781] text-[11px] mt-2">
+                      Dibuat {formatTimestamp(p.created_at)} · Diubah {formatTimestamp(p.updated_at)}
+                    </p>
+                  </div>
+                  <div className="flex gap-1 shrink-0">
+                    <button
+                      onClick={() => startEdit(p)}
+                      title="Edit proyek"
+                      className="p-2 rounded-lg text-[#8696a0] hover:text-[#00a884] hover:bg-[#2a3942] transition-colors"
+                    >
+                      <Pencil size={15} />
+                    </button>
+                    <button
+                      onClick={() => handleDelete(p.id)}
+                      title="Hapus proyek"
+                      className="p-2 rounded-lg text-[#8696a0] hover:text-[#f15c6d] hover:bg-[#2a3942] transition-colors"
+                    >
+                      <Trash2 size={15} />
+                    </button>
+                  </div>
+                </div>
+              )
+            )}
+          </div>
+        )}
+      </div>
+    </div>
+  );
+}
diff --git a/src/lib/db/index.ts b/src/lib/db/index.ts
index b0f40b6..3281e30 100644
--- a/src/lib/db/index.ts
+++ b/src/lib/db/index.ts
@@ -1,7 +1,7 @@
 import { createClient } from '@libsql/client';
 import path from 'path';
 import fs from 'fs';
-import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry } from '@/types';
+import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project } from '@/types';
 
 const DB_DIR = path.join(process.cwd(), 'data');
 if (!fs.existsSync(DB_DIR)) {
@@ -110,9 +110,84 @@ export async function ensureDbInitialized(): Promise<void> {
     END;
   `);
 
+  // Projects (Meja Kendali) — see _bmad-output/specs/spec-meja-kendali
+  await client.execute(`
+    CREATE TABLE IF NOT EXISTS projects (
+      id TEXT PRIMARY KEY,
+      name TEXT NOT NULL,
+      description TEXT NOT NULL DEFAULT '',
+      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
+      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
+    );
+  `);
+
   isInitialized = true;
 }
 
+// =============================================================================
+// Projects (Meja Kendali) — see _bmad-output/specs/spec-meja-kendali
+// Schema contract (architecture-diagrams.md): id, name, description, created_at, updated_at
+// =============================================================================
+
+function mapProjectRow(row: any): Project {
+  return {
+    id: String(row.id),
+    name: String(row.name),
+    description: String(row.description ?? ''),
+    created_at: String(row.created_at),
+    updated_at: String(row.updated_at),
+  };
+}
+
+export async function createProject(
+  id: string,
+  name: string,
+  description: string = ''
+): Promise<Project> {
+  await ensureDbInitialized();
+  await client.execute({
+    sql: `INSERT INTO projects (id, name, description) VALUES (?, ?, ?)`,
+    args: [id, name, description],
+  });
+  const res = await client.execute({ sql: `SELECT * FROM projects WHERE id = ?`, args: [id] });
+  return mapProjectRow(res.rows[0]);
+}
+
+export async function listProjects(): Promise<Project[]> {
+  await ensureDbInitialized();
+  const res = await client.execute(
+    `SELECT * FROM projects ORDER BY datetime(updated_at) DESC`
+  );
+  return res.rows.map(mapProjectRow);
+}
+
+export async function getProjectById(id: string): Promise<Project | null> {
+  await ensureDbInitialized();
+  const res = await client.execute({ sql: `SELECT * FROM projects WHERE id = ?`, args: [id] });
+  if (res.rows.length === 0) return null;
+  return mapProjectRow(res.rows[0]);
+}
+
+export async function updateProject(
+  id: string,
+  fields: { name?: string; description?: string }
+): Promise<Project | null> {
+  await ensureDbInitialized();
+  const existing = await getProjectById(id);
+  if (!existing) return null;
+  await client.execute({
+    sql: `UPDATE projects SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?`,
+    args: [fields.name ?? existing.name, fields.description ?? existing.description, id],
+  });
+  return getProjectById(id);
+}
+
+export async function deleteProject(id: string): Promise<boolean> {
+  await ensureDbInitialized();
+  const res = await client.execute({ sql: `DELETE FROM projects WHERE id = ?`, args: [id] });
+  return res.rowsAffected > 0;
+}
+
 export async function createConversation(id: string, title: string = 'Percakapan Baru'): Promise<Conversation> {
   await ensureDbInitialized();
   await client.execute({
diff --git a/src/types/index.ts b/src/types/index.ts
index 397ce4e..00e43d8 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -103,6 +103,14 @@ export interface ConversationWithMessages extends Conversation {
   messages: Message[];
 }
 
+export interface Project {
+  id: string;
+  name: string;
+  description: string;
+  created_at: string;
+  updated_at: string;
+}
+
 export interface SearchResult {
   id: string;
   title: string;
----- END DIFF -----
