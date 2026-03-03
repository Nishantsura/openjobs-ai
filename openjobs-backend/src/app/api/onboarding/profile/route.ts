import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase';

const onboardingSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  linkedinUrl: z.string().url().or(z.string().length(0)).default(''),
  city: z.string().min(1),
  expectedSalaryRange: z.string().min(1),
  preferredLocations: z.array(z.string()).optional().default([]),
  workMode: z.enum(['onsite', 'hybrid', 'remote']).optional().default('hybrid'),
  noticePeriod: z.string().optional().default(''),
  workAuthorization: z.string().optional().default(''),
  willingToRelocate: z.boolean().optional().default(false),
  earliestJoiningDate: z.string().optional().default(''),
  yearsPmExperience: z.string().optional().default(''),
  totalYearsExperience: z.string().optional().default(''),
  portfolioUrl: z.string().url().or(z.string().length(0)).default(''),
  highestEducation: z.string().optional().default(''),
  linkedinHeadlineSummary: z.string().optional().default('')
});

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:onboarding-profile`, 40, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = onboardingSchema.safeParse(json);
  if (!parsed.success) {
    return fail('Invalid onboarding payload', 400, parsed.error.flatten(), 'ONBOARDING_INVALID');
  }

  const profile = parsed.data;
  const supabase = getSupabaseAdmin();
  const upsert = await supabase.from('profiles').upsert({
    user_id: auth.user.id,
    structured_profile_json: {
      ...profile,
      updatedAt: new Date().toISOString(),
      source: 'extension-onboarding'
    }
  });

  if (upsert.error) {
    return fail('Failed to save onboarding profile', 500, upsert.error.message, 'ONBOARDING_SAVE_FAILED');
  }

  return ok({
    saved: true,
    userId: auth.user.id
  });
}
