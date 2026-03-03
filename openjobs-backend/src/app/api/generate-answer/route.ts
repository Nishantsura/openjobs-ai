import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateText } from '@/lib/openai';
import { screeningAnswerSystemPrompt } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  question: z.string().min(3),
  jobDescription: z.string().min(10),
  profile: z.record(z.string(), z.any())
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:generate-answer`, 40, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail('Invalid request payload', 400, parsed.error.flatten());

  const { question, jobDescription, profile } = parsed.data;

  try {
    const answer = await generateText(
      screeningAnswerSystemPrompt,
      `Question: ${question}\n\nJob Description:\n${jobDescription}\n\nCandidate Profile JSON:\n${JSON.stringify(profile)}`
    );

    await logGeneration({ userId: auth.user.id, endpoint: 'generate-answer', status: 'ok' });
    return ok({ answer });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation failure';
    await logGeneration({
      userId: auth.user.id,
      endpoint: 'generate-answer',
      status: 'error',
      note: message
    });
    return fail('Failed to generate answer', 500, message);
  }
}
