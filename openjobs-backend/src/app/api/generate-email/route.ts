import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateJson } from '@/lib/openai';
import { emailSystemPrompt, PROMPT_VERSION } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  postContext: z.string().min(10),
  profile: z.record(z.string(), z.any())
});

const responseSchema = z.object({
  subject: z.string(),
  body: z.string(),
  recommendedResumeType: z.enum(['base', 'optimized']).default('base')
});

export async function POST(request: Request) {
  const traceId = crypto.randomUUID();
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:generate-email`, 20, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail('Invalid request payload', 400, parsed.error.flatten());

  try {
    const generated = await generateJson<z.infer<typeof responseSchema>>(
      emailSystemPrompt,
      `Hiring Post:\n${parsed.data.postContext}\n\nCandidate Profile JSON:\n${JSON.stringify(parsed.data.profile)}`
    );

    const response = responseSchema.parse(generated);
    if (response.subject.length > 120 || response.body.split(/\s+/).length > 260) {
      return fail(
        'Generated email exceeded quality limits',
        422,
        { subjectLength: response.subject.length, bodyWords: response.body.split(/\s+/).length },
        'EMAIL_QUALITY_INVALID',
        traceId
      );
    }
    await logGeneration({ userId: auth.user.id, endpoint: 'generate-email', status: 'ok' });
    return ok({ ...response, promptVersion: PROMPT_VERSION }, 200, traceId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation failure';
    await logGeneration({
      userId: auth.user.id,
      endpoint: 'generate-email',
      status: 'error',
      note: message
    });
    return fail('Failed to generate email', 500, message, 'EMAIL_GENERATION_FAILED', traceId);
  }
}
