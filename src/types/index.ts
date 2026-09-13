export type Role = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  message_id: string;
  filename: string;
  mime_type: string;
  storage_path: string;
  created_at: string;
}

export interface MarkdownBlock {
  type: 'markdown';
  content: string;
}

export interface IllustrationBlock {
  type: 'illustration';
  prompt: string;
  alt?: string;
  caption?: string;
  imageUrl?: string;
  svgContent?: string;
  failed?: boolean;
}

export interface MermaidBlock {
  type: 'mermaid';
  code: string;
  caption?: string;
}

export interface FunFactBlock {
  type: 'fun_fact';
  content: string;
}

export interface TryItBlock {
  type: 'try_it';
  title?: string;
  steps: string[];
}

export type ResponseBlock =
  | MarkdownBlock
  | IllustrationBlock
  | MermaidBlock
  | FunFactBlock
  | TryItBlock;

export interface AssistantPersona {
  id?: string;
  name?: string;
  title?: string;
}

export interface AssistantResponsePayload {
  persona?: AssistantPersona;
  autoTitle?: string;
  blocks: ResponseBlock[];
  knowledge_entry?: PendingKnowledgeEntry;
  knowledge_status?: 'pending' | 'saved' | 'skipped';
  knowledge_id?: string;
  knowledge_updated?: boolean;
  kb_confirm?: KbConfirmDelete;
}

export interface PendingKnowledgeEntry {
  type: KnowledgeEntryType;
  name: string;
  function_summary: string;
  when_to_use: string;
  how_to_start: string;
}

export interface KbConfirmDelete {
  action: 'delete';
  entry_id: string;
  name: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
}

export interface Message {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  behavior_context?: string | null;
  response_payload?: string | null;
  created_at: string;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export type StageName = 'planning' | 'design' | 'development' | 'testing' | 'deployment' | 'maintenance';

export type StageStatusValue = 'selesai' | 'draf' | 'belum_dimulai';

// Kontrak API status: DB menyimpan 'draft' | 'approved' (EN);
// derived StageStatusValue 'selesai' | 'draf' | 'belum_dimulai' (ID) —
// pemetaan tunggal ada di deriveStageStatus (src/lib/db/index.ts).

export type ProjectStageStatuses = Record<StageName, StageStatusValue>;

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  matched_role: Role | 'title';
  created_at: string;
}

export type KnowledgeEntryType = 'tool' | 'library' | 'layanan' | 'konsep' | (string & {});

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeEntryType;
  name: string;
  function_summary: string;
  when_to_use: string;
  how_to_start: string;
  created_at: string;
  updated_at: string;
}
