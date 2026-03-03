import { z } from 'zod';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const optionalNonEmptyString = z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_RESUME_BUCKET: z.string().min(1).default('resumes'),
  AI_PROVIDER: z.enum(['openai', 'openrouter']).default('openrouter'),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_MODEL: z.string().min(1).default('gpt-4.1-mini'),
  OPENROUTER_API_KEY: optionalNonEmptyString,
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_MODEL: z.string().min(1).default('openrouter/free'),
  OPENROUTER_FALLBACK_MODELS: optionalNonEmptyString,
  OPENROUTER_SITE_URL: optionalUrl,
  OPENROUTER_SITE_NAME: optionalNonEmptyString,
  BILLING_URL: optionalUrl
}).superRefine((env, ctx) => {
  if (env.AI_PROVIDER === 'openai' && !env.OPENAI_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OPENAI_API_KEY'],
      message: 'OPENAI_API_KEY is required when AI_PROVIDER=openai'
    });
  }
  if (env.AI_PROVIDER === 'openrouter' && !env.OPENROUTER_API_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['OPENROUTER_API_KEY'],
      message: 'OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter'
    });
  }
});

export type RuntimeEnv = z.infer<typeof envSchema>;

let cachedEnv: RuntimeEnv | null = null;

export function getEnv(): RuntimeEnv {
  if (cachedEnv) return cachedEnv;

  cachedEnv = envSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_RESUME_BUCKET: process.env.SUPABASE_RESUME_BUCKET,
    AI_PROVIDER: process.env.AI_PROVIDER,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL: process.env.OPENROUTER_BASE_URL,
    OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
    OPENROUTER_FALLBACK_MODELS: process.env.OPENROUTER_FALLBACK_MODELS,
    OPENROUTER_SITE_URL: process.env.OPENROUTER_SITE_URL,
    OPENROUTER_SITE_NAME: process.env.OPENROUTER_SITE_NAME,
    BILLING_URL: process.env.BILLING_URL
  });

  return cachedEnv;
}
