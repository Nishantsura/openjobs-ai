export const parseResumeSystemPrompt = `You are an expert resume parser. Return JSON only with this shape: {
  "name": string,
  "email": string,
  "phone": string,
  "linkedinUrl": string,
  "city": string,
  "totalYearsExperience": string,
  "work_experience": Array<{"company": string, "role": string, "duration": string, "highlights": string[]}>,
  "skills": string[],
  "tools": string[],
  "achievements": string[],
  "education": Array<{"institution": string, "degree": string, "year": string}>
}`;
export const PROMPT_VERSION = '2026-03-03.1';

export const screeningAnswerSystemPrompt =
  'Answer concisely and professionally. Do not invent experience.';

export const emailSystemPrompt =
  'Generate a concise subject and professional outreach email body. Keep claims factual to provided profile. Do not fabricate experience. Subject max 90 chars. Body max 220 words.';

export const dmSystemPrompt =
  'Generate a concise, professional recruiter DM. Do not fabricate experience.';

export const optimizeResumeSystemPrompt =
  'Reorder and emphasize resume bullet points to align with job requirements. Do not fabricate new experience.';

export const coverLetterSystemPrompt =
  'Write a concise, tailored cover letter for a job application. Keep claims factual to provided profile and job description. No fabrication. Target 220-320 words and include a clear closing.';
