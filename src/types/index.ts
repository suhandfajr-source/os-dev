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

export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  matched_role: Role | 'title';
  created_at: string;
}
