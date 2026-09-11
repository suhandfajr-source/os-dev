CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_attachments_message_id ON attachments(message_id);

-- Knowledge base (Dokumentasi Tools) — see docs/specs/spec-dokumentasi-tools
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

CREATE INDEX IF NOT EXISTS idx_knowledge_entries_type ON knowledge_entries(type);

CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5(
  name, function_summary, when_to_use, how_to_start, type,
  content='knowledge_entries', content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS knowledge_fts_insert AFTER INSERT ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(rowid, name, function_summary, when_to_use, how_to_start, type)
  VALUES (new.rowid, new.name, new.function_summary, new.when_to_use, new.how_to_start, new.type);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_fts_update AFTER UPDATE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, name, function_summary, when_to_use, how_to_start, type)
  VALUES ('delete', old.rowid, old.name, old.function_summary, old.when_to_use, old.how_to_start, old.type);
  INSERT INTO knowledge_fts(rowid, name, function_summary, when_to_use, how_to_start, type)
  VALUES (new.rowid, new.name, new.function_summary, new.when_to_use, new.how_to_start, new.type);
END;

CREATE TRIGGER IF NOT EXISTS knowledge_fts_delete AFTER DELETE ON knowledge_entries BEGIN
  INSERT INTO knowledge_fts(knowledge_fts, rowid, name, function_summary, when_to_use, how_to_start, type)
  VALUES ('delete', old.rowid, old.name, old.function_summary, old.when_to_use, old.how_to_start, old.type);
END;
