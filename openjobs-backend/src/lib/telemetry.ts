type ApiEventInput = {
  traceId: string;
  endpoint: string;
  method: string;
  userId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  retryCount?: number;
  status: number;
  ok: boolean;
  errorCode?: string;
};

export function logApiEvent(input: ApiEventInput) {
  const payload = {
    ts: new Date().toISOString(),
    type: 'openjobs_api_event',
    ...input
  };
  // Structured JSON logs for quick RCA and production log pipeline ingestion.
  console.log(JSON.stringify(payload));
}

