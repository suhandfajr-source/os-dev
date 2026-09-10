import { GoogleGenAI } from '@google/genai';
import { AIProvider, GenerateResponseParams, RoutingResult } from './types';

const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
];

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;
  private primaryModel: string;

  constructor(apiKey?: string, modelName?: string) {
    const key = apiKey || process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '';
    if (!key) {
      console.warn('AI_API_KEY / GEMINI_API_KEY is not set. AI calls will fail until configured.');
    }
    this.ai = new GoogleGenAI({ apiKey: key });
    this.primaryModel = modelName || process.env.AI_MODEL || 'gemini-3.5-flash-lite';
  }

  /**
   * Lightweight classification if needed separately (otherwise handled in single-pass).
   */
  async classifyPersona(
    userMessage: string,
    briefText: string,
    contextSnippet?: string
  ): Promise<RoutingResult> {
    return {};
  }

  /**
   * Generate structured response from the LLM with automatic multi-model fallback on rate limits.
   */
  async generateResponse(params: GenerateResponseParams): Promise<string> {
    const contents = params.messages.map((msg) => {
      const parts: any[] = [];

      // Multimodal attachments
      if (msg.images && msg.images.length > 0) {
        for (const img of msg.images) {
          if (img.inlineData) {
            parts.push({
              inlineData: {
                data: img.inlineData.data,
                mimeType: img.inlineData.mimeType,
              },
            });
          }
        }
      }

      if (msg.content && msg.content.trim().length > 0) {
        parts.push({ text: msg.content });
      } else if (parts.length === 0) {
        parts.push({ text: '(Pesan kosong)' });
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });

    // Build model candidate list starting with primary model
    const candidateModels = [this.primaryModel, ...FALLBACK_MODELS.filter((m) => m !== this.primaryModel)];
    let lastError: any = null;

    // Helper for sleep
    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    for (const model of candidateModels) {
      // Try with retry for rate limits
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await this.ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction: params.systemPrompt,
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          });

          if (result.text && result.text.trim().length > 0) {
            return result.text;
          }
        } catch (err: any) {
          lastError = err;
          const isRateLimit = err?.status === 429 || /quota|resource_exhausted|rate limit/i.test(err?.message || '');
          if (isRateLimit && attempt < 2) {
            const waitMs = 2500 * (attempt + 1);
            console.warn(`Model ${model} hit rate limit, retrying in ${waitMs}ms (attempt ${attempt + 1}/3)...`);
            await sleep(waitMs);
            continue;
          }
          console.warn(`Model ${model} issue (${err?.status || err?.message?.slice(0, 60)}), trying next candidate...`);
          break;
        }
      }
    }

    throw lastError || new Error('Gagal menghubungi model AI Gemini.');
  }

  /**
   * Generate title (handled in single-pass).
   */
  async generateTitle(firstMessage: string): Promise<string> {
    return 'Percakapan Baru';
  }
}

// Export default singleton instance
let providerInstance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new GeminiProvider();
  }
  return providerInstance;
}
