import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateText } from '@/lib/openai';
import { dmSystemPrompt } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';

const bodySchema = z.object({
  postContext: z.string().min(10),
  profile: z.record(z.string(), z.any())
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:generate-dm`, 30, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail('Invalid request payload', 400, parsed.error.flatten());

  try {
    const message = await generateText(
      dmSystemPrompt,
      `Hiring Post:\n${parsed.data.postContext}\n\nCandidate Profile JSON:\n${JSON.stringify(parsed.data.profile)}`
    );

    await logGeneration({ userId: auth.user.id, endpoint: 'generate-dm', status: 'ok' });
    return ok({ message });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown generation failure';
    await logGeneration({
      userId: auth.user.id,
      endpoint: 'generate-dm',
      status: 'error',
      note: details
    });
    return fail('Failed to generate DM', 500, details);
  }
}
