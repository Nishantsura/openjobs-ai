import { ok } from '@/lib/api';

export async function GET() {
  return ok({ service: 'openjobs-backend', status: 'healthy' });
}
