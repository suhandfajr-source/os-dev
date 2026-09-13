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

===== CLAIMS FILE (spec story 2) — read only at Step 5 =====
---
title: 'Status Tahapan — Planning & Development'
type: 'feature'
created: '2026-09-13'
status: 'in-progress'
route: 'oneshot'
review_loop_iteration: 0
baseline_commit: '6077a388bc24fb79528acbfe9ab3d334d8321fdf'
context: ['_bmad-output/specs/spec-meja-kendali/SPEC.md', '_bmad-output/specs/spec-meja-kendali/architecture-diagrams.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Meja Kendali belum bisa menjawab "proyek ini sudah sampai mana?" — CAP-4: user perlu melihat status tiap tahapan (selesai/belum) dan apa yang belum dikerjakan, sebagai disiplin advisory (CAP-7) tanpa mengunci tahapan. Di R1 status cukup untuk tahap Planning dan Development; empat tahap lain tampil "belum dimulai" (mesin 6 tahap penuh tuntas di R2).

**Approach:** Tabel `artifact` dibuat persis mengikuti kontrak skema inti di `architecture-diagrams.md`; status tahap **dihitung** (derived, tidak disimpan) dari `artifact.status = approved` per stage via endpoint status per proyek, dan ditampilkan sebagai baris status 6 tahap di kartu proyek Dashboard. Status wisaya lain (wizard) akan mengisi tabel ini di story berikutnya.

</frozen-after-approval>

## Implementation Notes

- `src/types/index.ts` — tambah `StageName`, `StageStatusValue`, `ProjectStageStatuses`.
- `src/lib/db/index.ts` — tabel `artifacts` (kontrak skema inti) + index `(project_id, stage)`; fungsi `getAllStageStatuses()` menghitung status per proyek dari artifacts (derived, tidak disimpan); R1 hanya menghitung `planning` & `development`, 4 tahap lain tetap `belum_dimulai` sesuai stories.yaml (tuntas di R2).
- `src/app/api/projects/status/route.ts` — BARU: GET peta status semua proyek dalam satu fetch; static segment `status` aman dari conflict dengan `[id]`.
- `src/app/dashboard/page.tsx` — chip status 6 tahap di kartu proyek (hijau=selesai, kuning=draf, abu=belum); refresh status setelah create/edit, dibuang saat delete.
- Keputusan: aturan status uniform untuk semua stage (selesai = ≥1 approved; draf = ≥1 draft tanpa approved) — persis kontrak elicitation; wizard stories berikutnya cukup insert artifacts.
- Keputusan: tidak ada endpoint per-proyek (N+1 dihindari) — UI personal, satu endpoint peta penuh cukup.

===== REVIEW CONTENT (unified diff) =====
----- BEGIN DIFF -----
diff --git a/src/app/api/projects/status/route.ts b/src/app/api/projects/status/route.ts
new file mode 100644
index 0000000..ed2f4b4
--- /dev/null
+++ b/src/app/api/projects/status/route.ts
@@ -0,0 +1,16 @@
+import { NextResponse } from 'next/server';
+import { getAllStageStatuses } from '@/lib/db';
+
+export const runtime = 'nodejs';
+
+// GET /api/projects/status — peta status tahapan untuk semua proyek (CAP-4).
+// Static segment 'status' di-Next.js diprioritaskan di atas [id], aman dari route conflict.
+export async function GET() {
+  try {
+    const statuses = await getAllStageStatuses();
+    return NextResponse.json({ statuses });
+  } catch (err: unknown) {
+    console.error('Error fetching stage statuses:', err);
+    return NextResponse.json({ error: 'Gagal memuat status tahapan.' }, { status: 500 });
+  }
+}
diff --git a/src/app/dashboard/page.tsx b/src/app/dashboard/page.tsx
index 4dd825a..d78f48b 100644
--- a/src/app/dashboard/page.tsx
+++ b/src/app/dashboard/page.tsx
@@ -2,7 +2,24 @@
 
 import React, { useState, useEffect, useCallback } from 'react';
 import { FolderPlus, Pencil, Trash2, Check, X, LayoutDashboard } from 'lucide-react';
-import { Project } from '@/types';
+import { Project, StageName, StageStatusValue, ProjectStageStatuses } from '@/types';
+
+const STAGE_LABELS: Record<StageName, string> = {
+  planning: 'Planning',
+  design: 'Design',
+  development: 'Development',
+  testing: 'Testing',
+  deployment: 'Deployment',
+  maintenance: 'Maintenance',
+};
+
+const STAGE_ORDER: StageName[] = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];
+
+function statusChipClass(s: StageStatusValue): string {
+  if (s === 'selesai') return 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/40';
+  if (s === 'draf') return 'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/40';
+  return 'bg-[#2a3942] text-[#667781] border-[#2f3b43]';
+}
 
 export default function DashboardPage() {
   const [projects, setProjects] = useState<Project[]>([]);
@@ -14,6 +31,19 @@ export default function DashboardPage() {
   const [editDescription, setEditDescription] = useState('');
   const [loading, setLoading] = useState(true);
   const [busy, setBusy] = useState(false);
+  const [stageStatuses, setStageStatuses] = useState<Record<string, ProjectStageStatuses>>({});
+
+  const fetchStageStatuses = useCallback(async () => {
+    try {
+      const res = await fetch('/api/projects/status');
+      if (res.ok) {
+        const data = await res.json();
+        setStageStatuses(data.statuses || {});
+      }
+    } catch (err) {
+      console.error('Failed to fetch stage statuses:', err);
+    }
+  }, []);
 
   const fetchProjects = useCallback(async () => {
     try {
@@ -34,7 +64,8 @@ export default function DashboardPage() {
 
   useEffect(() => {
     fetchProjects();
-  }, [fetchProjects]);
+    fetchStageStatuses();
+  }, [fetchProjects, fetchStageStatuses]);
 
   const handleCreate = async (e: React.FormEvent) => {
     e.preventDefault();
@@ -52,6 +83,7 @@ export default function DashboardPage() {
         return;
       }
       setProjects((prev) => [data.project, ...prev]);
+      fetchStageStatuses();
       setNewName('');
       setNewDescription('');
     } catch (err) {
@@ -85,6 +117,7 @@ export default function DashboardPage() {
       }
       // ordering server = updated_at DESC: item yang baru diedit pindah ke atas
       setProjects((prev) => [data.project, ...prev.filter((p) => p.id !== id)]);
+      fetchStageStatuses();
       cancelEdit();
     } catch (err) {
       console.error('Failed to update project:', err);
@@ -105,6 +138,11 @@ export default function DashboardPage() {
         return;
       }
       setProjects((prev) => prev.filter((p) => p.id !== id));
+      setStageStatuses((prev) => {
+        const next = { ...prev };
+        delete next[id];
+        return next;
+      });
     } catch (err) {
       console.error('Failed to delete project:', err);
       setError('Gagal menghapus proyek.');
@@ -232,6 +270,26 @@ export default function DashboardPage() {
                     <p className="text-[#667781] text-[11px] mt-2">
                       Dibuat {formatTimestamp(p.created_at)} · Diubah {formatTimestamp(p.updated_at)}
                     </p>
+                    <div className="flex flex-wrap gap-1 mt-2">
+                      {STAGE_ORDER.map((stage) => {
+                        const s = stageStatuses[p.id]?.[stage] ?? 'belum_dimulai';
+                        return (
+                          <span
+                            key={stage}
+                            className={`text-[10px] px-1.5 py-0.5 rounded border ${statusChipClass(s)}`}
+                            title={
+                              s === 'selesai'
+                                ? 'Tahap selesai (artefak disetujui)'
+                                : s === 'draf'
+                                  ? 'Dalam proses (ada draf artefak)'
+                                  : 'Belum dimulai'
+                            }
+                          >
+                            {STAGE_LABELS[stage]}
+                          </span>
+                        );
+                      })}
+                    </div>
                   </div>
                   <div className="flex gap-1 shrink-0">
                     <button
diff --git a/src/lib/db/index.ts b/src/lib/db/index.ts
index 119c5ea..171af8c 100644
--- a/src/lib/db/index.ts
+++ b/src/lib/db/index.ts
@@ -1,7 +1,7 @@
 import { createClient } from '@libsql/client';
 import path from 'path';
 import fs from 'fs';
-import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project } from '@/types';
+import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project, StageName, StageStatusValue, ProjectStageStatuses } from '@/types';
 
 const DB_DIR = path.join(process.cwd(), 'data');
 if (!fs.existsSync(DB_DIR)) {
@@ -121,6 +121,26 @@ export async function ensureDbInitialized(): Promise<void> {
     );
   `);
 
+  // Artifacts (Meja Kendali) — kontrak skema inti: architecture-diagrams.md
+  // status tahap DIHITUNG dari artifacts ini, tidak disimpan terpisah (CAP-4/CAP-7)
+  await client.execute(`
+    CREATE TABLE IF NOT EXISTS artifacts (
+      id TEXT PRIMARY KEY,
+      project_id TEXT NOT NULL,
+      stage TEXT NOT NULL,
+      type TEXT NOT NULL,
+      status TEXT NOT NULL DEFAULT 'draft',
+      content TEXT NOT NULL DEFAULT '',
+      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
+      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
+      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
+    );
+  `);
+
+  await client.execute(`
+    CREATE INDEX IF NOT EXISTS idx_artifacts_project_stage ON artifacts(project_id, stage);
+  `);
+
   isInitialized = true;
 }
 
@@ -191,6 +211,57 @@ export async function deleteProject(id: string): Promise<boolean> {
   return res.rowsAffected > 0;
 }
 
+// =============================================================================
+// Stage Status (Meja Kendali) — derived dari artifacts, bukan disimpan (CAP-4/CAP-7)
+// Aturan (kontrak elicitation): selesai = >=1 artifact approved; draf = >=1 draft
+// tanpa approved; belum_dimulai = tanpa artifact. Di R1 hanya planning &
+// development yang dihitung; 4 tahap lain tetap belum_dimulai (tuntas di R2).
+// =============================================================================
+
+const ALL_STAGES: StageName[] = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];
+const COMPUTED_STAGES_R1: StageName[] = ['planning', 'development'];
+
+function defaultStageStatuses(): ProjectStageStatuses {
+  const out = {} as ProjectStageStatuses;
+  for (const s of ALL_STAGES) out[s] = 'belum_dimulai';
+  return out;
+}
+
+function deriveStageStatus(rows: { status: string }[]): StageStatusValue {
+  const has = (s: string) => rows.some((r) => r.status === s);
+  if (has('approved')) return 'selesai';
+  if (has('draft')) return 'draf';
+  return 'belum_dimulai';
+}
+
+export async function getAllStageStatuses(): Promise<Record<string, ProjectStageStatuses>> {
+  await ensureDbInitialized();
+  const res = await client.execute(
+    `SELECT project_id, stage, status FROM artifacts`
+  );
+  const byProjectStage = new Map<string, Map<StageName, { status: string }[]>>();
+  for (const row of res.rows) {
+    const pid = String(row.project_id);
+    const stage = String(row.stage) as StageName;
+    if (!ALL_STAGES.includes(stage)) continue;
+    if (!byProjectStage.has(pid)) byProjectStage.set(pid, new Map());
+    const stageMap = byProjectStage.get(pid)!;
+    if (!stageMap.has(stage)) stageMap.set(stage, []);
+    stageMap.get(stage)!.push({ status: String(row.status) });
+  }
+
+  const out: Record<string, ProjectStageStatuses> = {};
+  for (const pid of byProjectStage.keys()) {
+    const statuses = defaultStageStatuses();
+    const stageMap = byProjectStage.get(pid)!;
+    for (const stage of COMPUTED_STAGES_R1) {
+      statuses[stage] = deriveStageStatus(stageMap.get(stage) || []);
+    }
+    out[pid] = statuses;
+  }
+  return out;
+}
+
 export async function createConversation(id: string, title: string = 'Percakapan Baru'): Promise<Conversation> {
   await ensureDbInitialized();
   await client.execute({
diff --git a/src/types/index.ts b/src/types/index.ts
index 00e43d8..8bd6b9d 100644
--- a/src/types/index.ts
+++ b/src/types/index.ts
@@ -111,6 +111,12 @@ export interface Project {
   updated_at: string;
 }
 
+export type StageName = 'planning' | 'design' | 'development' | 'testing' | 'deployment' | 'maintenance';
+
+export type StageStatusValue = 'selesai' | 'draf' | 'belum_dimulai';
+
+export type ProjectStageStatuses = Record<StageName, StageStatusValue>;
+
 export interface SearchResult {
   id: string;
   title: string;
----- END DIFF -----
