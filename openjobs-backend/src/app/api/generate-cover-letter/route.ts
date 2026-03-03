import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateTextWithMeta } from '@/lib/openai';
import { coverLetterSystemPrompt, PROMPT_VERSION } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';
import { logApiEvent } from '@/lib/telemetry';

const bodySchema = z.object({
  jobDescription: z.string().min(20),
  profile: z.record(z.string(), z.any())
});

export async function POST(request: Request) {
  const started = Date.now();
  const traceId = crypto.randomUUID();
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:generate-cover-letter`, 20, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail('Invalid request payload', 400, parsed.error.flatten());

  try {
    const generated = await generateTextWithMeta(
      coverLetterSystemPrompt,
      `Job Description:\n${parsed.data.jobDescription}\n\nCandidate Profile JSON:\n${JSON.stringify(parsed.data.profile)}`
    );
    const coverLetter = generated.text.trim();
    const words = coverLetter.split(/\s+/).filter(Boolean).length;
    if (words < 120 || words > 420) {
      return fail(
        'Cover letter length out of allowed range',
        422,
        { words, min: 120, max: 420 },
        'COVER_LETTER_LENGTH_INVALID',
        traceId
      );
    }
    const banned = ['as an ai language model', 'i cannot', 'i do not have personal'];
    const hasBanned = banned.find((token) => coverLetter.toLowerCase().includes(token));
    if (hasBanned) {
      return fail(
        'Cover letter failed quality guardrails',
        422,
        { token: hasBanned },
        'COVER_LETTER_QUALITY_INVALID',
        traceId
      );
    }

    await logGeneration({
      userId: auth.user.id,
      endpoint: 'generate-cover-letter',
      status: 'ok',
      note: `prompt=${PROMPT_VERSION};provider=${generated.meta.provider};model=${generated.meta.model};retries=${generated.meta.retryCount}`
    });
    logApiEvent({
      traceId,
      endpoint: '/api/generate-cover-letter',
      method: 'POST',
      userId: auth.user.id,
      provider: generated.meta.provider,
      model: generated.meta.model,
      retryCount: generated.meta.retryCount,
      latencyMs: Date.now() - started,
      status: 200,
      ok: true
    });
    return ok({ coverLetter, promptVersion: PROMPT_VERSION }, 200, traceId);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown generation failure';
    await logGeneration({
      userId: auth.user.id,
      endpoint: 'generate-cover-letter',
      status: 'error',
      note: details
    });
    logApiEvent({
      traceId,
      endpoint: '/api/generate-cover-letter',
      method: 'POST',
      userId: auth.user.id,
      latencyMs: Date.now() - started,
      status: 500,
      ok: false,
      errorCode: 'COVER_LETTER_GENERATION_FAILED'
    });
    return fail('Failed to generate cover letter', 500, details, 'COVER_LETTER_GENERATION_FAILED', traceId);
  }
}
