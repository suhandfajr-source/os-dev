import { getAssistantBrief } from './prompt-builder';
import { AIProvider, RoutingResult } from './types';

export interface RouteParams {
  userMessage: string;
  contextSnippet?: string;
  provider: AIProvider;
}

/**
 * AI Behavior Router
 * Reads rules directly from assistant-brief.md without hardcoding persona definitions.
 * Performs lightweight AI classification to select the proper persona/behavior context.
 */
export async function routeBehavior({
  userMessage,
  contextSnippet,
  provider,
}: RouteParams): Promise<RoutingResult> {
  const briefText = getAssistantBrief();
  if (!briefText || briefText.trim().length === 0) {
    return {};
  }

  return await provider.classifyPersona(userMessage, briefText, contextSnippet);
}
