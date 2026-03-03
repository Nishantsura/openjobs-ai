import { getEnv } from '@/lib/env';
import { fail, ok } from '@/lib/api';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const checks = {
    env: false,
    supabase: false,
    ai: false
  };
  const details: Record<string, string> = {};

  try {
    const env = getEnv();
    checks.env = true;

    checks.ai = Boolean(
      env.AI_PROVIDER === 'openrouter' ? env.OPENROUTER_API_KEY : env.OPENAI_API_KEY
    );
    if (!checks.ai) details.ai = 'Missing AI provider API key';

    try {
      const supabase = getSupabaseAdmin();
      // Lightweight check: only verifies auth and connection.
      const result = await supabase.from('profiles').select('user_id').limit(1);
      if (result.error) {
        details.supabase = result.error.message;
      } else {
        checks.supabase = true;
      }
    } catch (error) {
      details.supabase = error instanceof Error ? error.message : 'Supabase check failed';
    }
  } catch (error) {
    details.env = error instanceof Error ? error.message : 'Environment validation failed';
  }

  const healthy = checks.env && checks.supabase && checks.ai;
  if (!healthy) {
    return fail(
      'Readiness check failed',
      503,
      {
        checks,
        details
      },
      'READINESS_FAILED'
    );
  }

  return ok({
    status: 'ready',
    checks
  });
}

