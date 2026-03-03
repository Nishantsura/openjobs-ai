import { describe, it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import selectors from '../platform_selectors.js';

function dom(html) {
  return new JSDOM(html).window.document;
}

describe('platform selectors', () => {
  it('finds greenhouse application form', () => {
    const doc = dom('<form id="application_form"><input name="first_name" /></form>');
    expect(selectors.findGreenhouseForm(doc)?.id).toBe('application_form');
  });

  it('finds greenhouse apply CTA when form is absent', () => {
    const doc = dom('<a href="#application">Apply for this job</a>');
    expect(selectors.findGreenhouseApplyCta(doc)).toBeTruthy();
  });

  it('finds lever form', () => {
    const doc = dom('<form id="application-form"><input name="name" /></form>');
    expect(selectors.findLeverForm(doc)?.id).toBe('application-form');
  });

  it('finds indeed form', () => {
    const doc = dom('<form data-testid="job-apply-form"><input name="email" /></form>');
    expect(selectors.findIndeedForm(doc)).toBeTruthy();
  });

  it('finds glassdoor form', () => {
    const doc = dom('<form data-test="apply-form"><input name="email" /></form>');
    expect(selectors.findGlassdoorForm(doc)).toBeTruthy();
  });

  it('finds wellfound form', () => {
    const doc = dom('<form action="/apply"><input name="email" /></form>');
    expect(selectors.findWellfoundForm(doc)).toBeTruthy();
  });

  it('returns null when no controls exist', () => {
    const doc = dom('<form id="application_form"></form>');
    expect(selectors.findGreenhouseForm(doc)).toBeNull();
  });
});
