import OpenAI from 'openai';
import { getEnv } from './env';

type ChatMessage = { role: 'system' | 'user'; content: string };
type GenerationMeta = {
  provider: 'openai' | 'openrouter';
  model: string;
  retryCount: number;
};

function tryParseJson<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

function extractJsonObject(content: string): string | null {
  const text = String(content || '').trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function parseFallbackModels(value?: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
}

function getClientAndModel() {
  const env = getEnv();
  if (env.AI_PROVIDER === 'openrouter') {
    const headers: Record<string, string> = {};
    if (env.OPENROUTER_SITE_URL) headers['HTTP-Referer'] = env.OPENROUTER_SITE_URL;
    if (env.OPENROUTER_SITE_NAME) headers['X-Title'] = env.OPENROUTER_SITE_NAME;

    return {
      provider: 'openrouter' as const,
      client: new OpenAI({
        apiKey: env.OPENROUTER_API_KEY,
        baseURL: env.OPENROUTER_BASE_URL,
        defaultHeaders: headers
      }),
      model: env.OPENROUTER_MODEL,
      fallbackModels: parseFallbackModels(env.OPENROUTER_FALLBACK_MODELS)
    };
  }

  return {
    provider: 'openai' as const,
    client: new OpenAI({ apiKey: env.OPENAI_API_KEY }),
    model: env.OPENAI_MODEL,
    fallbackModels: []
  };
}

function isRetryableOpenRouterError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as { status?: number; message?: string; error?: { message?: string } };
  const status = anyErr.status;
  const message = anyErr.message || anyErr.error?.message || '';
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 429 ||
    /network/i.test(message) ||
    /timeout/i.test(message) ||
    /rate[- ]?limit/i.test(message) ||
    /temporarily rate[- ]?limited/i.test(message) ||
    /No endpoints found/i.test(message)
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateRaw(messages: ChatMessage[], asJson: boolean): Promise<{ content: string; meta: GenerationMeta }> {
  const { client, model, fallbackModels, provider } = getClientAndModel();
  const modelsToTry = [model, ...fallbackModels];
  let lastError: unknown = null;
  let retryCount = 0;

  for (const candidate of modelsToTry) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const result = await client.chat.completions.create({
          model: candidate,
          ...(asJson ? { response_format: { type: 'json_object' as const } } : {}),
          messages
        });

        const content = result.choices[0]?.message?.content;
        if (!content) throw new Error('No model content returned');
        return {
          content,
          meta: {
            provider,
            model: candidate,
            retryCount
          }
        };
      } catch (error) {
        lastError = error;
        if (!isRetryableOpenRouterError(error)) {
          throw error;
        }
        retryCount += 1;
        const delay = Math.min(3000, 250 * 2 ** attempt) + Math.floor(Math.random() * 120);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Model request failed');
}

export async function generateJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const baseMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  const first = await generateRaw(baseMessages, true);
  const direct = tryParseJson<T>(first.content);
  if (direct) return direct;

  const extracted = extractJsonObject(first.content);
  if (extracted) {
    const parsed = tryParseJson<T>(extracted);
    if (parsed) return parsed;
  }

  const strictRetry = await generateRaw(
    [
      {
        role: 'system',
        content: `${systemPrompt}\n\nReturn ONLY a valid JSON object. Do not include any preface, markdown, or extra text.`
      },
      { role: 'user', content: userPrompt }
    ],
    false
  );
  const retryDirect = tryParseJson<T>(strictRetry.content);
  if (retryDirect) return retryDirect;

  const retryExtracted = extractJsonObject(strictRetry.content);
  if (retryExtracted) {
    const parsed = tryParseJson<T>(retryExtracted);
    if (parsed) return parsed;
  }

  throw new Error('Model did not return valid JSON');
}

export async function generateText(systemPrompt: string, userPrompt: string): Promise<string> {
  const result = await generateRaw(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    false
  );
  return result.content.trim();
}

export async function generateTextWithMeta(systemPrompt: string, userPrompt: string): Promise<{ text: string; meta: GenerationMeta }> {
  const result = await generateRaw(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    false
  );
  return {
    text: result.content.trim(),
    meta: result.meta
  };
}
