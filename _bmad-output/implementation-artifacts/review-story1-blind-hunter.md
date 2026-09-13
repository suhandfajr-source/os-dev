Conduct a review of CONTENT.
Look for what's missing, not only what's wrong.
Compute your finding floor N from the diff file's size: N = min(floor(sqrt(kB) + 1), 10), where kB is the file's size in kilobytes. State the arithmetic in one line, then find at least N issues to fix or improve.
Output a Markdown list of findings only — no severity, priority, or ranking.
If the content is empty, stop and say so.
If you have zero findings, re-check and keep thinking; do not stop with an empty list.

Do not invoke any skill, and do not spawn subagents of your own — you are the reviewer. Return your findings as text in your final message.

CONTENT: the unified diff below (content under review).

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
