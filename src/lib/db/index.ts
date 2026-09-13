import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult, KnowledgeEntry, Project, StageName, StageStatusValue, ProjectStageStatuses, Artifact, ArtifactStage, ArtifactType, ArtifactStatus, Story, StoryStatus } from '@/types';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'assistant.db');
const client = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

// Promise-cached (bukan flag boolean): menutup race concurrent-init saat cold start
// Next.js / HMR — semua caller menunggu inisialisasi yang sama. (Walkthrough 324ad1b #3.2)
let initPromise: Promise<void> | null = null;

export function ensureDbInitialized(): Promise<void> {
  initPromise ??= doInitialize();
  return initPromise;
}

async function doInitialize(): Promise<void> {
  // Kontrak eksplisit: cascade FK tidak boleh bergantung pada default client libsql
  // (Walkthrough 324ad1b #10)
  await client.execute('PRAGMA foreign_keys = ON;');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      behavior_context TEXT,
      response_payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);`);
  await client.execute(`CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);`);

  // Safe migration check: Inspect columns using PRAGMA before altering
  const tableInfo = await client.execute(`PRAGMA table_info(messages);`);
  const hasResponsePayload = tableInfo.rows.some((col) => col.name === 'response_payload');
  if (!hasResponsePayload) {
    await client.execute(`ALTER TABLE messages ADD COLUMN response_payload TEXT;`);
  }

  // Knowledge base (Dokumentasi Tools) — see docs/specs/spec-dokumentasi-tools
  await client.execute(`
    CREATE TABLE IF NOT EXISTS knowledge_entries (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      function_summary TEXT NOT NULL,
      when_to_use TEXT NOT NULL,
      how_to_start TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_knowledge_entries_type ON knowledge_entries(type);
  `);

  await client.execute(`
    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
      name, function_summary, when_to_use, how_to_start, type,
      content='knowledge_entries', content_rowid='rowid'
    );
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS knowledge_fts_insert AFTER INSERT ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(rowid, name, function_summary, when_to_use, how_to_start, type)
      VALUES (new.rowid, new.name, new.function_summary, new.when_to_use, new.how_to_start, new.type);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS knowledge_fts_update AFTER UPDATE ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, name, function_summary, when_to_use, how_to_start, type)
      VALUES ('delete', old.rowid, old.name, old.function_summary, old.when_to_use, old.how_to_start, old.type);
      INSERT INTO knowledge_fts(rowid, name, function_summary, when_to_use, how_to_start, type)
      VALUES (new.rowid, new.name, new.function_summary, new.when_to_use, new.how_to_start, new.type);
    END;
  `);

  await client.execute(`
    CREATE TRIGGER IF NOT EXISTS knowledge_fts_delete AFTER DELETE ON knowledge_entries BEGIN
      INSERT INTO knowledge_fts(knowledge_fts, rowid, name, function_summary, when_to_use, how_to_start, type)
      VALUES ('delete', old.rowid, old.name, old.function_summary, old.when_to_use, old.how_to_start, old.type);
    END;
  `);

  // Projects (Meja Kendali) — see _bmad-output/specs/spec-meja-kendali
  await client.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Artifacts (Meja Kendali) — kontrak skema inti: architecture-diagrams.md (nama tabel: `artifact`)
  // status tahap DIHITUNG dari tabel ini, tidak disimpan terpisah (CAP-4/CAP-7)
  // Migrasi terjaga: samakan nama tabel hasil pengembangan awal dengan kontrak.
  // Atomik via batch (transaksi implisit) + idempoten: kalau ALTER gagal, boot
  // berikutnya mengulang dengan aman. (Walkthrough 324ad1b #3.1)
  const legacyTable = await client.execute(
    `SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'artifacts'`
  );
  if (legacyTable.rows.length > 0) {
    await client.batch(
      [
        { sql: `DROP INDEX IF EXISTS idx_artifacts_project_stage`, args: [] },
        { sql: `ALTER TABLE artifacts RENAME TO artifact`, args: [] },
      ],
      'write'
    );
  }

  await client.execute(`
    CREATE TABLE IF NOT EXISTS artifact (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      content TEXT NOT NULL DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_artifact_project_stage ON artifact(project_id, stage);
  `);

  // Stories (Meja Kendali) — kontrak skema inti: architecture-diagrams.md.
  // PENTING: kolom "order" adalah reserved keyword SQLite — wajib dikutip di semua query
  // (walkthrough elicitation story 4).
  await client.execute(`
    CREATE TABLE IF NOT EXISTS story (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'draft',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_story_project_order ON story(project_id, "order");
  `);

  // Walkthrough 324ad1b #3.2: penanda akhir doInitialize (pengganti flag isInitialized)
}

// =============================================================================
// Projects (Meja Kendali) — see _bmad-output/specs/spec-meja-kendali
// Schema contract (architecture-diagrams.md): id, name, description, created_at, updated_at
// =============================================================================

function mapProjectRow(row: any): Project {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createProject(
  id: string,
  name: string,
  description: string = ''
): Promise<Project> {
  await ensureDbInitialized();
  // Presisi milidetik agar ordering "terbaru di atas" reliable untuk aksi beruntun
  // (datetime('now') hanya resolusi detik → bisa tie).
  const now = `strftime('%Y-%m-%d %H:%M:%f','now')`;
  await client.execute({
    sql: `INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ${now}, ${now})`,
    args: [id, name, description],
  });
  const res = await client.execute({ sql: `SELECT * FROM projects WHERE id = ?`, args: [id] });
  return mapProjectRow(res.rows[0]);
}

export async function listProjects(): Promise<Project[]> {
  await ensureDbInitialized();
  const res = await client.execute(
    `SELECT * FROM projects ORDER BY datetime(updated_at) DESC`
  );
  return res.rows.map(mapProjectRow);
}

export async function getProjectById(id: string): Promise<Project | null> {
  await ensureDbInitialized();
  const res = await client.execute({ sql: `SELECT * FROM projects WHERE id = ?`, args: [id] });
  if (res.rows.length === 0) return null;
  return mapProjectRow(res.rows[0]);
}

export async function updateProject(
  id: string,
  fields: { name?: string; description?: string }
): Promise<Project | null> {
  await ensureDbInitialized();
  const existing = await getProjectById(id);
  if (!existing) return null;
  await client.execute({
    sql: `UPDATE projects SET name = ?, description = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
    args: [fields.name ?? existing.name, fields.description ?? existing.description, id],
  });
  return getProjectById(id);
}

export async function deleteProject(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const res = await client.execute({ sql: `DELETE FROM projects WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}

// =============================================================================
// Stage Status (Meja Kendali) — derived dari artifacts, bukan disimpan (CAP-4/CAP-7)
// Aturan (kontrak elicitation): selesai = >=1 artifact approved; draf = >=1 draft
// tanpa approved; belum_dimulai = tanpa artifact. Di R1 hanya planning &
// development yang dihitung; 4 tahap lain tetap belum_dimulai (tuntas di R2).
// =============================================================================

const ALL_STAGES: StageName[] = ['planning', 'design', 'development', 'testing', 'deployment', 'maintenance'];
const COMPUTED_STAGES_R1: StageName[] = ['planning', 'development'];

function defaultStageStatuses(): ProjectStageStatuses {
  const out = {} as ProjectStageStatuses;
  for (const s of ALL_STAGES) out[s] = 'belum_dimulai';
  return out;
}

function deriveStageStatus(rows: { status: string }[]): StageStatusValue {
  const has = (s: string) => rows.some((r) => r.status === s);
  if (has('approved')) return 'selesai';
  if (has('draft')) return 'draf';
  return 'belum_dimulai';
}

export async function getAllStageStatuses(): Promise<Record<string, ProjectStageStatuses>> {
  await ensureDbInitialized();
  // Peta memuat SEMUA proyek — proyek tanpa artifact tetap punya entri default
  const projectsRes = await client.execute(`SELECT id FROM projects`);
  const out: Record<string, ProjectStageStatuses> = {};
  for (const row of projectsRes.rows) {
    out[String(row.id)] = defaultStageStatuses();
  }

  const res = await client.execute(
    `SELECT project_id, stage, status FROM artifact`
  );
  const byProjectStage = new Map<string, Map<StageName, { status: string }[]>>();
  const unknownStages = new Set<string>();
  for (const row of res.rows) {
    const pid = String(row.project_id);
    const stage = String(row.stage) as StageName;
    if (!ALL_STAGES.includes(stage)) {
      // Typo stage jangan hanyut: tandai di log tanpa mengubah perilaku (Walkthrough 324ad1b #9)
      unknownStages.add(stage);
      continue;
    }
    if (!byProjectStage.has(pid)) byProjectStage.set(pid, new Map());
    const stageMap = byProjectStage.get(pid)!;
    if (!stageMap.has(stage)) stageMap.set(stage, []);
    stageMap.get(stage)!.push({ status: String(row.status) });
  }

  for (const [pid, stageMap] of byProjectStage) {
    if (!out[pid]) continue; // artifact yatim — cascade seharusnya mencegah, jaga tetap aman
    const statuses = out[pid];
    for (const stage of COMPUTED_STAGES_R1) {
      statuses[stage] = deriveStageStatus(stageMap.get(stage) || []);
    }
  }
  if (unknownStages.size > 0) {
    console.warn(`[db] Stage tidak dikenal dilewati saat menghitung status: ${[...unknownStages].join(', ')}`);
  }
  return out;
}

// =============================================================================
// Spec & Stories (Meja Kendali) — wizard Planning tahap pecah PRD (story 4)
// =============================================================================

/**
 * Upsert spec artifact — atomik terhadap approved (pola upsertPrdArtifact).
 * Return null bila spec sudah approved (TOCTOU).
 */
export async function upsertSpecArtifact(
  projectId: string,
  content: string,
  id: string
): Promise<Artifact | null> {
  await ensureDbInitialized();
  const existing = await getArtifactRowByProjectStageType(projectId, 'planning', 'spec');
  if (existing) {
    const res = await client.execute({
      sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ? AND status != 'approved'`,
      args: [content, existing.id],
    });
    if (res.rowsAffected === 0) return null;
    return getArtifactById(existing.id);
  }
  await client.execute({
    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', 'spec', 'draft', ?)`,
    args: [id, projectId, content],
  });
  return getArtifactById(id);
}

function mapStoryRow(row: any): Story {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    title: String(row.title),
    description: String(row.description ?? ''),
    status: String(row.status) as StoryStatus,
    order: Number(row.order),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

/**
 * Ganti seluruh stories proyek (regenerasi): delete + insert dalam satu batch
 * (transaksi implisit). Order dinomori ulang 0..N-1 deterministik.
 */
export async function replaceStories(
  projectId: string,
  stories: { title: string; description: string }[],
  idPrefix: string
): Promise<Story[]> {
  await ensureDbInitialized();
  const now = `strftime('%Y-%m-%d %H:%M:%f','now')`;
  const stmts: { sql: string; args: (string | number)[] }[] = [
    { sql: `DELETE FROM story WHERE project_id = ?`, args: [projectId] },
  ];
  stories.forEach((s, i) => {
    stmts.push({
      sql: `INSERT INTO story (id, project_id, title, description, status, "order", created_at, updated_at) VALUES (?, ?, ?, ?, 'draft', ?, ${now}, ${now})`,
      args: [`${idPrefix}-${i}`, projectId, s.title, s.description, i],
    });
  });
  await client.batch(stmts, 'write');
  return listStories(projectId);
}

export async function listStories(projectId: string): Promise<Story[]> {
  await ensureDbInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM story WHERE project_id = ? ORDER BY "order" ASC`,
    args: [projectId],
  });
  return res.rows.map(mapStoryRow);
}

export async function getStoryById(id: string): Promise<Story | null> {
  await ensureDbInitialized();
  const res = await client.execute({ sql: `SELECT * FROM story WHERE id = ?`, args: [id] });
  return res.rows.length > 0 ? mapStoryRow(res.rows[0]) : null;
}

export async function updateStory(
  id: string,
  fields: { title?: string; description?: string }
): Promise<Story | null> {
  await ensureDbInitialized();
  const existing = await getStoryById(id);
  if (!existing) return null;
  await client.execute({
    sql: `UPDATE story SET title = ?, description = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
    args: [fields.title ?? existing.title, fields.description ?? existing.description, id],
  });
  return getStoryById(id);
}

export async function approveStory(id: string): Promise<Story | null> {
  await ensureDbInitialized();
  const existing = await getStoryById(id);
  if (!existing) return null;
  if (existing.status === 'approved') {
    // Approve ulang: no-op aman, updated_at TIDAK diubah
    return existing;
  }
  await client.execute({
    sql: `UPDATE story SET status = 'approved', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
    args: [id],
  });
  return getStoryById(id);
}

export async function createConversation(id: string, title: string = 'Percakapan Baru'): Promise<Conversation> {
  await ensureDbInitialized();
  await client.execute({
    sql: `INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))`,
    args: [id, title],
  });
  const conv = await getConversationById(id);
  return conv!;
}

export async function getConversationById(id: string): Promise<Conversation | null> {
  await ensureDbInitialized();
  const res = await client.execute({
    sql: `SELECT id, title, created_at, updated_at FROM conversations WHERE id = ?`,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    title: String(row.title),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listConversations(): Promise<Conversation[]> {
  await ensureDbInitialized();
  const res = await client.execute(`
    SELECT id, title, created_at, updated_at
    FROM conversations
    ORDER BY updated_at DESC
  `);
  return res.rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function updateConversationTitle(id: string, title: string): Promise<void> {
  await ensureDbInitialized();
  await client.execute({
    sql: `UPDATE conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [title, id],
  });
}

export async function touchConversation(id: string): Promise<void> {
  await ensureDbInitialized();
  await client.execute({
    sql: `UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`,
    args: [id],
  });
}

export async function deleteConversation(id: string): Promise<string[]> {
  await ensureDbInitialized();
  // Get all attachment storage paths
  const getAttachments = await client.execute({
    sql: `
      SELECT a.storage_path
      FROM attachments a
      JOIN messages m ON a.message_id = m.id
      WHERE m.conversation_id = ?
    `,
    args: [id],
  });

  const storagePaths = getAttachments.rows.map((r) => String(r.storage_path));

  // Delete conversation (cascades messages & attachments)
  await client.execute({
    sql: `DELETE FROM conversations WHERE id = ?`,
    args: [id],
  });

  return storagePaths;
}

export async function getConversationWithMessages(id: string): Promise<ConversationWithMessages | null> {
  await ensureDbInitialized();
  const conv = await getConversationById(id);
  if (!conv) return null;

  const messagesRes = await client.execute({
    sql: `
      SELECT id, conversation_id, role, content, behavior_context, response_payload, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY datetime(created_at) ASC, rowid ASC
    `,
    args: [id],
  });

  const attachmentsRes = await client.execute({
    sql: `
      SELECT a.id, a.message_id, a.filename, a.mime_type, a.storage_path, a.created_at
      FROM attachments a
      JOIN messages m ON a.message_id = m.id
      WHERE m.conversation_id = ?
      ORDER BY datetime(a.created_at) ASC
    `,
    args: [id],
  });

  const allAttachments: Attachment[] = attachmentsRes.rows.map((r) => ({
    id: String(r.id),
    message_id: String(r.message_id),
    filename: String(r.filename),
    mime_type: String(r.mime_type),
    storage_path: String(r.storage_path),
    created_at: String(r.created_at),
  }));

  const attachmentsByMessageId = new Map<string, Attachment[]>();
  for (const att of allAttachments) {
    if (!attachmentsByMessageId.has(att.message_id)) {
      attachmentsByMessageId.set(att.message_id, []);
    }
    attachmentsByMessageId.get(att.message_id)!.push(att);
  }

  const messages: Message[] = messagesRes.rows.map((r) => {
    const msgId = String(r.id);
    return {
      id: msgId,
      conversation_id: String(r.conversation_id),
      role: String(r.role) as 'user' | 'assistant' | 'system',
      content: String(r.content),
      behavior_context: r.behavior_context ? String(r.behavior_context) : null,
      response_payload: r.response_payload ? String(r.response_payload) : null,
      created_at: String(r.created_at),
      attachments: attachmentsByMessageId.get(msgId) || [],
    };
  });

  return {
    ...conv,
    messages,
  };
}

export async function addMessage(
  id: string,
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  behaviorContext?: string | null,
  responsePayload?: string | null
): Promise<Message> {
  await ensureDbInitialized();
  await client.execute({
    sql: `INSERT INTO messages (id, conversation_id, role, content, behavior_context, response_payload, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    args: [id, conversationId, role, content, behaviorContext || null, responsePayload || null],
  });
  await touchConversation(conversationId);

  return {
    id,
    conversation_id: conversationId,
    role,
    content,
    behavior_context: behaviorContext || null,
    response_payload: responsePayload || null,
    created_at: new Date().toISOString(),
    attachments: [],
  };
}

export async function addAttachment(
  id: string,
  messageId: string,
  filename: string,
  mimeType: string,
  storagePath: string
): Promise<Attachment> {
  await ensureDbInitialized();
  await client.execute({
    sql: `INSERT INTO attachments (id, message_id, filename, mime_type, storage_path, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    args: [id, messageId, filename, mimeType, storagePath],
  });

  return {
    id,
    message_id: messageId,
    filename,
    mime_type: mimeType,
    storage_path: storagePath,
    created_at: new Date().toISOString(),
  };
}

export async function searchConversations(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) return [];
  await ensureDbInitialized();

  const term = `%${query.trim()}%`;
  const res = await client.execute({
    sql: `
      SELECT DISTINCT 
        c.id,
        c.title,
        COALESCE(m.content, c.title) as snippet,
        CASE 
          WHEN c.title LIKE ? THEN 'title'
          ELSE m.role 
        END as matched_role,
        c.updated_at as created_at
      FROM conversations c
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE c.title LIKE ? OR m.content LIKE ?
      GROUP BY c.id
      ORDER BY c.updated_at DESC
      LIMIT 20
    `,
    args: [term, term, term],
  });

  return res.rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    snippet: String(r.snippet),
    matched_role: String(r.matched_role) as 'user' | 'assistant' | 'system' | 'title',
    created_at: String(r.created_at),
  }));
}

export async function getMessageById(id: string): Promise<Message | null> {
  await ensureDbInitialized();
  const res = await client.execute({
    sql: `SELECT id, conversation_id, role, content, behavior_context, response_payload, created_at FROM messages WHERE id = ?`,
    args: [id],
  });
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    id: String(row.id),
    conversation_id: String(row.conversation_id),
    role: String(row.role) as Message['role'],
    content: String(row.content),
    behavior_context: row.behavior_context ? String(row.behavior_context) : null,
    response_payload: row.response_payload ? String(row.response_payload) : null,
    created_at: String(row.created_at),
    attachments: [],
  };
}

export async function updateMessagePayload(messageId: string, responsePayload: string): Promise<void> {
  await ensureDbInitialized();
  await client.execute({
    sql: `UPDATE messages SET response_payload = ? WHERE id = ?`,
    args: [responsePayload, messageId],
  });
}

function mapKnowledgeRow(row: any): KnowledgeEntry {
  return {
    id: String(row.id),
    type: String(row.type),
    name: String(row.name),
    function_summary: String(row.function_summary),
    when_to_use: String(row.when_to_use),
    how_to_start: String(row.how_to_start),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createKnowledgeEntry(
  id: string,
  entry: { type: string; name: string; function_summary: string; when_to_use: string; how_to_start: string }
): Promise<KnowledgeEntry> {
  await ensureDbInitialized();
  await client.execute({
    sql: `INSERT INTO knowledge_entries (id, type, name, function_summary, when_to_use, how_to_start) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [id, entry.type, entry.name, entry.function_summary, entry.when_to_use, entry.how_to_start],
  });
  const res = await client.execute({ sql: `SELECT * FROM knowledge_entries WHERE id = ?`, args: [id] });
  return mapKnowledgeRow(res.rows[0]);
}

export async function updateKnowledgeEntry(
  id: string,
  entry: { type: string; name: string; function_summary: string; when_to_use: string; how_to_start: string }
): Promise<KnowledgeEntry> {
  await ensureDbInitialized();
  await client.execute({
    sql: `UPDATE knowledge_entries SET type = ?, name = ?, function_summary = ?, when_to_use = ?, how_to_start = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [entry.type, entry.name, entry.function_summary, entry.when_to_use, entry.how_to_start, id],
  });
  const res = await client.execute({ sql: `SELECT * FROM knowledge_entries WHERE id = ?`, args: [id] });
  return mapKnowledgeRow(res.rows[0]);
}

export async function searchKnowledge(query: string, limit: number = 3): Promise<KnowledgeEntry[]> {
  if (!query || query.trim().length === 0) return [];
  await ensureDbInitialized();

  // FTS5 aman: bungkus tiap token dengan kutip ganda, buang kutip dari input
  const matchQuery = query
    .trim()
    .split(/\s+/)
    .map((t) => `"${t.replace(/"/g, '')}"`)
    .join(' ');
  if (!matchQuery || matchQuery === '""') return [];

  try {
    const res = await client.execute({
      sql: `
        SELECT e.*
        FROM knowledge_fts f
        JOIN knowledge_entries e ON e.rowid = f.rowid
        WHERE knowledge_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `,
      args: [matchQuery, limit],
    });
    return res.rows.map(mapKnowledgeRow);
  } catch (err) {
    console.warn('Knowledge FTS search failed:', err);
    return [];
  }
}

export async function getKnowledgeEntries(): Promise<KnowledgeEntry[]> {
  await ensureDbInitialized();
  const res = await client.execute(`SELECT * FROM knowledge_entries ORDER BY datetime(updated_at) DESC`);
  return res.rows.map(mapKnowledgeRow);
}

export async function findKnowledgeEntriesByName(name: string): Promise<KnowledgeEntry[]> {
  await ensureDbInitialized();
  const res = await client.execute({
    sql: `SELECT * FROM knowledge_entries WHERE LOWER(name) LIKE ? ORDER BY datetime(updated_at) DESC`,
    args: [`%${name.trim().toLowerCase()}%`],
  });
  return res.rows.map(mapKnowledgeRow);
}

export async function deleteKnowledgeEntry(id: string): Promise<boolean> {
  await ensureDbInitialized();
  const res = await client.execute({ sql: `DELETE FROM knowledge_entries WHERE id = ?`, args: [id] });
  return res.rowsAffected > 0;
}

// =============================================================================
// Artifacts (Meja Kendali) — CRUD untuk wizard tahapan
// Kontrak skema: architecture-diagrams.md (tabel `artifact`).
// DISIPLIN updated_at: semua path tulis (kecuali approve-ulang) set eksplisit
// strftime('%Y-%m-%d %H:%M:%f','now') — SQLite tidak punya ON UPDATE.
// =============================================================================

function mapArtifactRow(row: any): Artifact {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    stage: String(row.stage) as ArtifactStage,
    type: String(row.type) as ArtifactType,
    status: String(row.status) as ArtifactStatus,
    content: String(row.content ?? ''),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getArtifactRowByProjectStageType(
  projectId: string,
  stage: ArtifactStage,
  type: ArtifactType
): Promise<Artifact | null> {
  const res = await client.execute({
    sql: `SELECT * FROM artifact WHERE project_id = ? AND stage = ? AND type = ? LIMIT 1`,
    args: [projectId, stage, type],
  });
  return res.rows.length > 0 ? mapArtifactRow(res.rows[0]) : null;
}

/**
 * Upsert artifact (brief / PRD): satu artifact per project+stage+type.
 * Brief selalu status 'draft' (derivasi status planning hanya dari approve PRD).
 */
export async function upsertBriefArtifact(
  projectId: string,
  content: string,
  id: string
): Promise<Artifact> {
  await ensureDbInitialized();
  const existing = await getArtifactRowByProjectStageType(projectId, 'planning', 'brief');
  if (existing) {
    await client.execute({
      sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
      args: [content, existing.id],
    });
    return (await getArtifactById(existing.id))!;
  }
  await client.execute({
    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', 'brief', 'draft', ?)`,
    args: [id, projectId, content],
  });
  return (await getArtifactById(id))!;
}

export async function upsertPrdArtifact(
  projectId: string,
  content: string,
  id: string
): Promise<Artifact | null> {
  await ensureDbInitialized();
  const existing = await getArtifactRowByProjectStageType(projectId, 'planning', 'prd');
  if (existing) {
    // Atomik di SQL: kalau approve terjadi di antara cek route dan update ini
    // (TOCTOU), UPDATE tidak mengenai baris approved — pemanggil return null → 409
    const res = await client.execute({
      sql: `UPDATE artifact SET content = ?, status = 'draft', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ? AND status != 'approved'`,
      args: [content, existing.id],
    });
    if (res.rowsAffected === 0) return null; // approved di antara cek dan simpan
    return getArtifactById(existing.id);
  }
  await client.execute({
    sql: `INSERT INTO artifact (id, project_id, stage, type, status, content) VALUES (?, ?, 'planning', 'prd', 'draft', ?)`,
    args: [id, projectId, content],
  });
  return getArtifactById(id);
}

export async function getArtifactById(id: string): Promise<Artifact | null> {
  await ensureDbInitialized();
  const res = await client.execute({ sql: `SELECT * FROM artifact WHERE id = ?`, args: [id] });
  return res.rows.length > 0 ? mapArtifactRow(res.rows[0]) : null;
}

export async function getArtifactsByProject(
  projectId: string,
  filter?: { stage?: ArtifactStage; type?: ArtifactType }
): Promise<Artifact[]> {
  await ensureDbInitialized();
  const clauses: string[] = ['project_id = ?'];
  const args: (string)[] = [projectId];
  if (filter?.stage) {
    clauses.push('stage = ?');
    args.push(filter.stage);
  }
  if (filter?.type) {
    clauses.push('type = ?');
    args.push(filter.type);
  }
  const res = await client.execute({
    sql: `SELECT * FROM artifact WHERE ${clauses.join(' AND ')} ORDER BY datetime(updated_at) DESC`,
    args,
  });
  return res.rows.map(mapArtifactRow);
}

export async function updateArtifactContent(id: string, content: string): Promise<Artifact | null> {
  await ensureDbInitialized();
  const existing = await getArtifactById(id);
  if (!existing) return null;
  await client.execute({
    sql: `UPDATE artifact SET content = ?, updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
    args: [content, id],
  });
  return getArtifactById(id);
}

export async function approveArtifact(id: string): Promise<Artifact | null> {
  await ensureDbInitialized();
  const existing = await getArtifactById(id);
  if (!existing) return null;
  if (existing.status === 'approved') {
    // Approve ulang: no-op aman, updated_at TIDAK diubah (berbohong soal konten)
    return existing;
  }
  await client.execute({
    sql: `UPDATE artifact SET status = 'approved', updated_at = strftime('%Y-%m-%d %H:%M:%f','now') WHERE id = ?`,
    args: [id],
  });
  return getArtifactById(id);
}

export default client;
