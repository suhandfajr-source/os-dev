Read the review instructions below completely and follow them as your review instructions.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. If the instruction file is unreadable, report that exact failure and stop. Return your findings as text in your final message.

The review content (unified diff) is inlined after the instructions.

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
