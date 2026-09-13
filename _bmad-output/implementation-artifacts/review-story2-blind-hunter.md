Conduct a review of CONTENT.
Look for what's missing, not only what's wrong.
Compute your finding floor N from the size of the changes: N = min(floor(sqrt(kB) + 1), 10), where kB is the changed content's size in kilobytes. State the arithmetic in one line, then find at least N issues to fix or improve.
Output a Markdown list of findings only — no severity, priority, or ranking.
If the content is empty, stop and say so.
If you have zero findings, re-check and keep thinking; do not stop with an empty list.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in your final message.

CONTEXT: Story 2 "Status Tahapan" dari spec Meja Kendali — status tahap SDLC dihitung (derived) dari tabel `artifacts` (status approved/draft per stage), disajikan via GET /api/projects/status dan chip status di kartu proyek Dashboard. Di R1 hanya planning & development yang dihitung; 4 tahap lain selalu "belum_dimulai". Kontrak skema: architecture-diagrams.md (artifact: id, project_id, stage, type, status draft|approved, content, timestamps).

CONTENT: the unified diff below (content under review).

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
