import { describe, it, expect } from 'vitest';
import core from '../core.js';

describe('OpenJobs core normalize', () => {
  it('normalizes case and trims', () => {
    expect(core.normalize('  HELLO  ')).toBe('hello');
  });
});

describe('OpenJobs core detectFieldKey', () => {
  const patterns = {
    firstName: [/first\s*name/i],
    email: [/e-?mail/i],
    linkedinUrl: [/linkedin/i]
  };

  it('matches first name descriptors', () => {
    expect(core.detectFieldKey('applicant first name', patterns)).toBe('firstName');
  });

  it('matches email descriptors', () => {
    expect(core.detectFieldKey('work e-mail address', patterns)).toBe('email');
  });

  it('returns null for unmatched descriptors', () => {
    expect(core.detectFieldKey('favorite color', patterns)).toBeNull();
  });
});

describe('OpenJobs core actionIntent', () => {
  it('classifies submit actions', () => {
    expect(core.actionIntent('Submit application')).toBe('submit');
  });

  it('classifies next/review actions', () => {
    expect(core.actionIntent('Next')).toBe('next');
    expect(core.actionIntent('Review your application')).toBe('review');
  });

  it('classifies unknown actions', () => {
    expect(core.actionIntent('Proceed')).toBe('unknown');
  });
});

describe('OpenJobs core question and validation heuristics', () => {
  it('accepts likely screening questions', () => {
    expect(core.isLikelyQuestionText('Why do you want to work here?')).toBe(true);
  });

  it('rejects short profile labels as questions', () => {
    expect(core.isLikelyQuestionText('Email')).toBe(false);
  });

  it('detects validation error text', () => {
    expect(core.hasValidationErrorText('This field is required')).toBe(true);
  });
});
