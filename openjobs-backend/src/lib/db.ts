import { getSupabaseAdmin } from './supabase';

export async function logGeneration(input: {
  userId: string;
  endpoint: string;
  tokenEstimate?: number;
  status: 'ok' | 'error';
  note?: string;
}) {
  const supabaseAdmin = getSupabaseAdmin();
  await supabaseAdmin.from('generation_logs').insert({
    user_id: input.userId,
    endpoint: input.endpoint,
    token_estimate: input.tokenEstimate ?? null,
    status: input.status,
    note: input.note ?? null
  });
}
