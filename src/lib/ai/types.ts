export interface AIImageAttachment {
  inlineData?: {
    data: string; // base64
    mimeType: string;
  };
  url?: string;
  filename?: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: AIImageAttachment[];
}

export interface RoutingResult {
  personaName?: string;
  behaviorContext?: string;
  reasoning?: string;
}

export interface GenerateResponseParams {
  systemPrompt: string;
  messages: AIMessage[];
  behaviorContext?: string | null;
}

export interface AIProvider {
  classifyPersona(userMessage: string, briefText: string, contextSnippet?: string): Promise<RoutingResult>;
  generateResponse(params: GenerateResponseParams): Promise<string>;
  generateTitle(firstMessage: string): Promise<string>;
}
