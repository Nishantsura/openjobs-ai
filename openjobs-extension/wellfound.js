(() => {
  const selectors = globalThis.OpenJobsSelectors;
  const adapter = globalThis.OpenJobsFormAdapter;
  if (!selectors || !adapter) return;

  const SMART_CLASS = 'openjobs-smart-apply-wellfound';
  const FLOATING_ID = 'openjobs-smart-apply-wellfound-floating';

  function findForm() {
    return selectors.findWellfoundForm(document);
  }

  function findApplyCta() {
    const node = selectors.findWellfoundApplyCta?.(document);
    const text = (node?.textContent || node?.getAttribute?.('aria-label') || '').toLowerCase();
    if (!node) return null;
    if (text.includes('apply') || text.includes('submit') || text.includes('continue')) return node;
    return null;
  }

  async function waitForForm(maxTicks = 24) {
    for (let i = 0; i < maxTicks; i += 1) {
      const form = findForm();
      if (form) return form;
      await adapter.sleep(250);
    }
    // Some Wellfound pages render questions in generic containers instead of a form tag.
    const container = document.querySelector('[class*="application"], [data-testid*="application"], main');
    if (container && container.querySelector('input, textarea, [contenteditable="true"]')) return container;
    return null;
  }

  function statusFromResult(result) {
    if (!result) return 'Wellfound flow completed.';
    if (result.coverLetterFilled) return 'Wellfound cover letter generated and filled. Review and submit manually.';
    if (result.coverLetterDetected && !result.coverLetterFilled) {
      return 'Wellfound cover letter field detected but not filled. Check backend/auth and retry.';
    }
    if (result.filledFields > 0 || result.resumeUploaded) return 'Wellfound form updated. Review and submit manually.';
    return 'Opened Wellfound apply flow, but no fields were auto-filled. Please review manually.';
  }

  function attachFormButton(form) {
    if (!form || form.querySelector(`.${SMART_CLASS}`)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Applying...';
      try {
        const result = await adapter.runFormFill(form);
        adapter.showToast(statusFromResult(result));
      } catch (_err) {
        adapter.showToast('Smart Apply failed on Wellfound. Continue manually.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Smart Apply';
      }
    });

    form.prepend(button);
  }

  function attachFloatingButton() {
    if (document.getElementById(FLOATING_ID)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply');
    button.id = FLOATING_ID;
    button.style.position = 'fixed';
    button.style.right = '16px';
    button.style.bottom = '16px';

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Preparing...';
      try {
        let form = findForm();
        if (!form) {
          const cta = findApplyCta();
          if (cta) cta.click();
          form = await waitForForm();
        }
        if (!form) {
          adapter.showToast('No Wellfound application form detected on this page.', 'error');
          return;
        }
        const result = await adapter.runFormFill(form);
        adapter.showToast(statusFromResult(result));
      } catch (_err) {
        adapter.showToast('Smart Apply failed on Wellfound. Continue manually.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Smart Apply';
      }
    });

    document.body.appendChild(button);
  }

  function init() {
    const form = findForm();
    if (form) attachFormButton(form);
    attachFloatingButton();
  }

  const observer = new MutationObserver(() => init());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
