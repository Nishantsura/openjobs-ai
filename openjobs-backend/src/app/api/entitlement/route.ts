import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  // Do not hard-fail entitlement on full env parsing; this route must stay available for diagnostics.
  const aiProvider = String(process.env.AI_PROVIDER || 'openrouter').toLowerCase();
  const openRouterMode = aiProvider === 'openrouter';
  const supabaseAdmin = getSupabaseAdmin();

  try {
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('plan,status,current_period_end')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      // If table is not created yet, default to FREE instead of failing the extension.
      const msg = String(error.message || '').toLowerCase();
      if (
        msg.includes('relation') ||
        msg.includes('does not exist') ||
        msg.includes('could not find the table') ||
        msg.includes('schema cache')
      ) {
        return ok({
          userId: auth.user.id,
          plan: 'FREE',
          status: 'inactive',
          aiEnabled: openRouterMode,
          reason: 'subscriptions table missing'
        });
      }

      return fail('Failed to check entitlement', 500, error.message);
    }

    const plan = String(data?.plan || 'FREE').toUpperCase();
    const status = String(data?.status || 'inactive').toLowerCase();
    const active = status === 'active' || status === 'trialing';
    const paidEnabled = active && (plan === 'PRO' || plan === 'TRIAL' || plan === 'BUSINESS');
    return ok({
      userId: auth.user.id,
      plan,
      status,
      currentPeriodEnd: toIso(data?.current_period_end),
      aiEnabled: paidEnabled || openRouterMode
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown entitlement error';
    return fail('Failed to check entitlement', 500, details);
  }
}
