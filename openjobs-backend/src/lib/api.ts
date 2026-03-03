import { NextResponse } from 'next/server';

function makeTraceId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `trace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function defaultErrorCode(status: number) {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_FAILED';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'INTERNAL_ERROR';
  return 'REQUEST_FAILED';
}

export function ok<T>(data: T, status = 200, traceId = makeTraceId()) {
  return NextResponse.json({ ok: true, data, traceId }, { status });
}

export function fail(message: string, status = 400, details?: unknown, code?: string, traceId = makeTraceId()) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: code || defaultErrorCode(status),
        message,
        details
      },
      traceId
    },
    { status }
  );
}
