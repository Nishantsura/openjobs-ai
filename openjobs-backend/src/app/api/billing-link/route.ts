import { ok, fail } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { getEnv } from '@/lib/env';

export async function GET() {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const env = getEnv();
  if (!env.BILLING_URL) {
    return fail('Billing URL is not configured', 503);
  }

  // For now this is a hosted billing URL; next step is Stripe customer/session mapping.
  return ok({
    billingUrl: env.BILLING_URL,
    userId: auth.user.id
  });
}
