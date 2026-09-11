import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { Conversation, Message, Attachment, ConversationWithMessages, SearchResult } from '@/types';

const DB_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'assistant.db');
const client = createClient({
  url: `file:${DB_PATH.replace(/\\/g, '/')}`,
});

let isInitialized = false;

export async function ensureDbInitialized(): Promise<void> {
  if (isInitialized) return;

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

  isInitialized = true;
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

export default client;
