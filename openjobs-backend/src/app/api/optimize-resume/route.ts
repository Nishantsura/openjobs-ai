import { z } from 'zod';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { fail, ok } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { logGeneration } from '@/lib/db';
import { generateText } from '@/lib/openai';
import { optimizeResumeSystemPrompt } from '@/lib/prompts';
import { checkRateLimit } from '@/lib/rate-limit';
import { getEnv } from '@/lib/env';
import { getSupabaseAdmin } from '@/lib/supabase';
import crypto from 'node:crypto';

const bodySchema = z.object({
  jobDescription: z.string().min(20),
  profile: z.record(z.string(), z.any()).optional()
});

type ProfileRecord = Record<string, unknown>;

type OptimizedPayload = {
  jobFingerprint: string;
  storagePath: string;
  dataUrl: string;
  fileName: string;
};

function hashJobDescription(jobDescription: string) {
  return crypto.createHash('sha256').update(jobDescription).digest('hex');
}

function wrapText(text: string, maxChars: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (line.length + word.length + 1 > maxChars) {
      if (line.trim()) lines.push(line.trim());
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }

  if (line.trim()) lines.push(line.trim());
  return lines;
}

async function renderPdfFromText(text: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const fontSize = 11;
  const lineHeight = 14;
  const margin = 48;
  const maxWidth = 612 - margin * 2;
  const maxChars = Math.floor(maxWidth / (fontSize * 0.55));

  const lines = wrapText(text, maxChars);
  let y = 792 - margin;

  for (const line of lines) {
    if (y < margin + lineHeight) {
      const newPage = pdfDoc.addPage([612, 792]);
      y = 792 - margin;
      newPage.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    } else {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }
  }

  return pdfDoc.save();
}

async function getProfileFromDb(userId: string): Promise<ProfileRecord | null> {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('structured_profile_json')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return (data.structured_profile_json as ProfileRecord) ?? null;
}

async function fetchExistingVersion(userId: string, fingerprint: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('resume_versions')
    .select('id, storage_path')
    .eq('user_id', userId)
    .eq('job_fingerprint', fingerprint)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data?.storage_path) return null;

  const env = getEnv();
  const download = await supabaseAdmin.storage.from(env.SUPABASE_RESUME_BUCKET).download(data.storage_path);
  if (download.error || !download.data) return null;

  const arrayBuffer = await download.data.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  return {
    storagePath: data.storage_path,
    dataUrl: `data:application/pdf;base64,${base64}`,
    fileName: `optimized-${fingerprint.slice(0, 8)}.pdf`
  };
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth.error) return auth.error;

  const limit = checkRateLimit(`${auth.user.id}:optimize-resume`, 10, 60_000);
  if (!limit.allowed) return fail('Rate limit exceeded', 429);

  const json = await request.json();
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return fail('Invalid request payload', 400, parsed.error.flatten());

  const { jobDescription, profile } = parsed.data;
  const fingerprint = hashJobDescription(jobDescription);

  try {
    const existing = await fetchExistingVersion(auth.user.id, fingerprint);
    if (existing) {
      return ok({
        jobFingerprint: fingerprint,
        storagePath: existing.storagePath,
        dataUrl: existing.dataUrl,
        fileName: existing.fileName,
        reused: true
      });
    }

    const dbProfile = await getProfileFromDb(auth.user.id);
    const effectiveProfile = dbProfile ?? profile ?? {};

    const optimizedText = await generateText(
      optimizeResumeSystemPrompt,
      `Job Description:\n${jobDescription}\n\nCandidate Profile JSON:\n${JSON.stringify(effectiveProfile)}`
    );

    const pdfBytes = await renderPdfFromText(optimizedText || '');
    const env = getEnv();
    const supabaseAdmin = getSupabaseAdmin();
    const fileName = `optimized-${fingerprint.slice(0, 8)}.pdf`;
    const storagePath = `${auth.user.id}/optimized/${fingerprint}-${Date.now()}.pdf`;

    const upload = await supabaseAdmin.storage
      .from(env.SUPABASE_RESUME_BUCKET)
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: false });

    if (upload.error) {
      await logGeneration({
        userId: auth.user.id,
        endpoint: 'optimize-resume',
        status: 'error',
        note: upload.error.message
      });
      return fail('Failed to store optimized resume', 500, upload.error.message);
    }

    const versionInsert = await supabaseAdmin.from('resume_versions').insert({
      user_id: auth.user.id,
      source_resume_id: null,
      job_fingerprint: fingerprint,
      storage_path: storagePath
    });

    if (versionInsert.error) {
      await logGeneration({
        userId: auth.user.id,
        endpoint: 'optimize-resume',
        status: 'error',
        note: versionInsert.error.message
      });
      return fail('Failed to persist resume version', 500, versionInsert.error.message);
    }

    const base64 = Buffer.from(pdfBytes).toString('base64');

    await logGeneration({ userId: auth.user.id, endpoint: 'optimize-resume', status: 'ok' });

    const payload: OptimizedPayload & { reused: boolean } = {
      jobFingerprint: fingerprint,
      storagePath,
      dataUrl: `data:application/pdf;base64,${base64}`,
      fileName,
      reused: false
    };

    return ok(payload);
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown generation failure';
    await logGeneration({ userId: auth.user.id, endpoint: 'optimize-resume', status: 'error', note: details });
    return fail('Failed to optimize resume', 500, details);
  }
}
