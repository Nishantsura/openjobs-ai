import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { fail } from './api';
import { getSupabaseAnon } from './supabase';

function clientIdToUuid(clientId: string) {
  const hex = crypto.createHash('sha256').update(clientId).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function requireUser() {
  const allowAnon = process.env.ALLOW_ANON_EXTENSION === 'true';

  // Local dev bypass to unblock extension iteration when auth token flows are unstable.
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return {
      user: {
        id: '00000000-0000-0000-0000-000000000001'
      },
      token: 'dev-bypass'
    };
  }

  const headerList = await headers();
  const authHeader = headerList.get('authorization');
  const extensionClientId = headerList.get('x-openjobs-client-id');

  if (!authHeader?.startsWith('Bearer ')) {
    if (allowAnon) {
      const clientId = extensionClientId || 'anon-extension-client';
      return {
        user: {
          id: clientIdToUuid(clientId)
        },
        token: 'anon-extension'
      };
    }
    return { error: fail('Missing bearer token', 401) };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    return { error: fail('Invalid bearer token', 401) };
  }

  const supabaseAnon = getSupabaseAnon();
  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data?.user) {
    if (allowAnon) {
      const clientId = extensionClientId || `anon-${token.slice(0, 12) || 'extension-client'}`;
      return {
        user: {
          id: clientIdToUuid(clientId)
        },
        token: 'anon-extension'
      };
    }
    return { error: fail('Unauthorized', 401, error?.message) };
  }

  return { user: data.user, token };
}
