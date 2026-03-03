import { PDFParse } from 'pdf-parse';
import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateJson } from '@/lib/openai';
import { parseResumeSystemPrompt } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';
import { getEnv } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

const parsedProfileSchema = z.object({
  name: z.string().optional().default(''),
  email: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  linkedinUrl: z.string().optional().default(''),
  city: z.string().optional().default(''),
  totalYearsExperience: z.string().optional().default(''),
  work_experience: z
    .array(
      z.object({
        company: z.string().optional().default(''),
        role: z.string().optional().default(''),
        duration: z.string().optional().default(''),
        highlights: z.array(z.string()).optional().default([])
      })
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  tools: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  education: z
    .array(
      z.object({
        institution: z.string().optional().default(''),
        degree: z.string().optional().default(''),
        year: z.string().optional().default('')
      })
    )
    .default([])
});

export async function POST(request: Request) {
  const env = getEnv();
  const supabaseAdmin = getSupabaseAdmin();
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:parse-resume`, 10, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const formData = await request.formData();
  const file = formData.get('resume');

  if (!(file instanceof File)) {
    return fail('Missing file field `resume`', 400);
  }

  if (file.type !== 'application/pdf') {
    return fail('Only PDF resumes are supported', 400);
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const parser = new PDFParse({ data: bytes });
  const parsedPdf = await parser.getText().finally(async () => {
    await parser.destroy();
  });
  const rawText = parsedPdf.text?.trim();

  if (!rawText) {
    return fail('Could not extract text from PDF', 422);
  }

  try {
    const parsed = await generateJson<z.infer<typeof parsedProfileSchema>>(
      parseResumeSystemPrompt,
      `Resume text:\n\n${rawText}`
    );

    const profile = parsedProfileSchema.parse(parsed);
    const path = `${auth.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const upload = await supabaseAdmin.storage
      .from(env.SUPABASE_RESUME_BUCKET)
      .upload(path, bytes, { contentType: 'application/pdf', upsert: false });

    if (upload.error) {
      await logGeneration({
        userId: auth.user.id,
        endpoint: 'parse-resume',
        status: 'error',
        note: upload.error.message
      });
      return fail('Failed to store resume file', 500, upload.error.message);
    }

    const [resumeInsert, profileUpsert] = await Promise.all([
      supabaseAdmin.from('resumes').insert({
        user_id: auth.user.id,
        type: 'base',
        storage_path: path
      }),
      supabaseAdmin.from('profiles').upsert({
        user_id: auth.user.id,
        structured_profile_json: profile
      })
    ]);

    if (resumeInsert.error || profileUpsert.error) {
      await logGeneration({
        userId: auth.user.id,
        endpoint: 'parse-resume',
        status: 'error',
        note: resumeInsert.error?.message ?? profileUpsert.error?.message
      });
      return fail('Failed to persist parsed profile', 500, {
        resume: resumeInsert.error?.message,
        profile: profileUpsert.error?.message
      });
    }

    await logGeneration({
      userId: auth.user.id,
      endpoint: 'parse-resume',
      status: 'ok',
      tokenEstimate: Math.ceil(rawText.length / 4)
    });

    return ok({
      profile,
      resume: {
        path,
        bucket: env.SUPABASE_RESUME_BUCKET,
        name: file.name
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse failure';
    await logGeneration({
      userId: auth.user.id,
      endpoint: 'parse-resume',
      status: 'error',
      note: message
    });
    return fail('Resume parsing failed', 500, message);
  }
}
