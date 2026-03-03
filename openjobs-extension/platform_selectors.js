(function initOpenJobsSelectors(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.OpenJobsSelectors = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function makeOpenJobsSelectors() {
  function findFirst(root, selectors) {
    for (const selector of selectors) {
      const node = root.querySelector(selector);
      if (node) return node;
    }
    return null;
  }

  function findBestForm(root, selectors) {
    for (const selector of selectors) {
      const forms = Array.from(root.querySelectorAll(selector));
      const ranked = forms.find((form) => form.querySelector('input, textarea, select, [contenteditable="true"]'));
      if (ranked) return ranked;
    }
    return null;
  }

  function findGreenhouseForm(root) {
    return findBestForm(root, ['form#application_form', 'form.application_form', 'form']);
  }

  function findGreenhouseApplyCta(root) {
    return findFirst(root, [
      'a[data-mapped="true"]',
      'a[href*="#application"]',
      'a[href*="/apply"]',
      'button[data-qa="apply-button"]',
      'button'
    ]);
  }

  function findLeverForm(root) {
    return findBestForm(root, ['form#application-form', 'form.postings-btn-wrapper + form', 'form']);
  }

  function findIndeedForm(root) {
    return findBestForm(root, [
      'form[data-testid*="job"]',
      'form[id*="indeed"]',
      'form[action*="apply" i]',
      '[data-testid*="apply"] form',
      '[class*="apply"] form',
      'form'
    ]);
  }

  function findGlassdoorForm(root) {
    return findBestForm(root, [
      'form[data-test*="apply"]',
      'form[action*="apply"]',
      '[data-test*="apply"] form',
      '[class*="apply"] form',
      'form'
    ]);
  }

  function findWellfoundForm(root) {
    return findBestForm(root, [
      'form[data-testid*="apply"]',
      'form[action*="apply"]',
      '[data-testid*="application"]',
      '[class*="application"]',
      '[class*="apply"]',
      'form'
    ]);
  }

  function findNaukriForm(root) {
    return findBestForm(root, ['form[id*="apply"]', 'form[class*="apply"]', 'form[action*="apply"]', 'form']);
  }

  function findIndeedApplyCta(root) {
    return findFirst(root, [
      'button[data-testid*="apply"]',
      'button[aria-label*="apply" i]',
      'a[href*="apply" i]',
      'button'
    ]);
  }

  function findGlassdoorApplyCta(root) {
    return findFirst(root, [
      'button[data-test*="apply"]',
      'button[aria-label*="apply" i]',
      'a[href*="apply" i]',
      'button'
    ]);
  }

  function findWellfoundApplyCta(root) {
    return findFirst(root, [
      'button[data-testid*="apply"]',
      'button[aria-label*="apply" i]',
      'a[href*="apply" i]',
      'button'
    ]);
  }

  return {
    findBestForm,
    findGreenhouseForm,
    findGreenhouseApplyCta,
    findLeverForm,
    findIndeedForm,
    findGlassdoorForm,
    findWellfoundForm,
    findNaukriForm,
    findIndeedApplyCta,
    findGlassdoorApplyCta,
    findWellfoundApplyCta
  };
});
