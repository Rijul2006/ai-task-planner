import { GoogleGenAI } from '@google/genai';

// API Key setup from environment
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface AIResponse {
  type: 'text' | 'action_proposal';
  content?: string;
  action?: {
    id?: string;
    toolName: string;
    reason: string;
    status: string;
  };
}

export const generateTPMResponse = async (
  systemPrompt: string,
  userMessage: string,
  contextData: any
): Promise<AIResponse> => {
  try {
    const model = process.env.AI_MODEL || 'gemini-2.5-flash';

    const fullPrompt = `
      ${systemPrompt}

      CURRENT WORKSPACE CONTEXT:
      ${JSON.stringify(contextData, null, 2)}

      USER MESSAGE:
      ${userMessage}
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: fullPrompt,
    });

    const textOutput = response.text || 'Analysis complete.';

    return {
      type: 'text',
      content: textOutput,
    };
  } catch (err: any) {
    console.error('Gemini Provider Error:', err.message);
    return {
      type: 'text',
      content: 'Gemini AI TPM Co-Pilot is currently unable to process the request.',
    };
  }
};

export class AIProviderService {
  static async generate(
    systemPrompt: string,
    userMessage: string,
    contextData: unknown[]
  ): Promise<
    | { type: 'text'; text: string | undefined }
    | { type: 'tool_call'; toolCall: { name: string; args: Record<string, any> }; text?: string }
  > {
    const response = await generateTPMResponse(systemPrompt, userMessage, contextData);
    return {
      type: 'text' as const,
      text: response.content,
    };
  }
}