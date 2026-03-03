import { z } from 'zod';
import { fail, ok } from '@/lib/api';
import { getSupabaseAnon } from '@/lib/supabase';

const bodySchema = z.object({
  mode: z.enum(['password', 'magic_link', 'google_oauth']).default('password'),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  redirectTo: z.string().url().optional()
});

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return fail('Invalid auth payload', 400, parsed.error.flatten(), 'AUTH_PAYLOAD_INVALID');
  }

  const supabaseAnon = getSupabaseAnon();

  if (parsed.data.mode === 'google_oauth') {
    const result = await supabaseAnon.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Extension can pass chrome.identity redirect URL for token capture.
        redirectTo: parsed.data.redirectTo || 'https://openrouter.ai/'
      }
    });

    if (result.error || !result.data?.url) {
      return fail('Failed to start Google sign in', 400, result.error?.message || 'No OAuth URL', 'AUTH_GOOGLE_FAILED');
    }

    return ok({
      mode: 'google_oauth',
      url: result.data.url
    });
  }

  if (parsed.data.mode === 'magic_link') {
    if (!parsed.data.email) {
      return fail('Email is required for magic link mode', 400, null, 'AUTH_EMAIL_REQUIRED');
    }
    const result = await supabaseAnon.auth.signInWithOtp({
      email: parsed.data.email
    });

    if (result.error) {
      return fail('Failed to send magic link', 400, result.error.message, 'AUTH_MAGIC_LINK_FAILED');
    }

    return ok({
      mode: 'magic_link',
      sent: true
    });
  }

  if (!parsed.data.password) {
    return fail('Password is required for password mode', 400, null, 'AUTH_PASSWORD_REQUIRED');
  }
  if (!parsed.data.email) {
    return fail('Email is required for password mode', 400, null, 'AUTH_EMAIL_REQUIRED');
  }

  const result = await supabaseAnon.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (result.error || !result.data.session?.access_token) {
    return fail('Invalid credentials', 401, result.error?.message || 'No session returned', 'AUTH_INVALID_CREDENTIALS');
  }

  return ok({
    mode: 'password',
    accessToken: result.data.session.access_token,
    refreshToken: result.data.session.refresh_token,
    expiresAt: result.data.session.expires_at || null,
    user: {
      id: result.data.user?.id || null,
      email: result.data.user?.email || parsed.data.email
    }
  });
}
