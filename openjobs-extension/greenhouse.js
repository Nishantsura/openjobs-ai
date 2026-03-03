(() => {
  const selectors = globalThis.OpenJobsSelectors;
  const adapter = globalThis.OpenJobsFormAdapter;

  if (!selectors || !adapter) return;

  const SMART_CLASS = 'openjobs-smart-apply-greenhouse';
  const FLOATING_ID = 'openjobs-smart-apply-greenhouse-floating';

  function findForm() {
    return selectors.findGreenhouseForm(document);
  }

  function isLikelyApplyCta(node) {
    const text = (node?.textContent || '').toLowerCase().trim();
    return text.includes('apply for this job') || text === 'apply' || text.includes('apply now');
  }

  function findApplyCta() {
    const candidate = selectors.findGreenhouseApplyCta(document);
    if (candidate && isLikelyApplyCta(candidate)) return candidate;

    const buttons = Array.from(document.querySelectorAll('a, button'));
    return buttons.find((node) => isLikelyApplyCta(node)) || null;
  }

  function attachButtonNearForm(form) {
    if (!form || form.querySelector(`.${SMART_CLASS}`)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Applying...';
      try {
        await adapter.runFormFill(form);
        adapter.showToast('Greenhouse form filled. Review and submit manually.');
      } catch (_err) {
        adapter.showToast('Smart Apply failed. Continue manually.', 'error');
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
        const cta = findApplyCta();
        if (cta) cta.click();

        for (let i = 0; i < 20; i += 1) {
          const form = findForm();
          if (form) {
            await adapter.runFormFill(form);
            adapter.showToast('Greenhouse form filled. Review and submit manually.');
            return;
          }
          await adapter.sleep(250);
        }

        adapter.showToast('Application form not found yet. Open the form then retry.', 'error');
      } catch (_err) {
        adapter.showToast('Smart Apply failed. Continue manually.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Smart Apply';
      }
    });

    document.body.appendChild(button);
  }

  function init() {
    const form = findForm();
    if (form) {
      attachButtonNearForm(form);
      return;
    }

    const cta = findApplyCta();
    if (cta) {
      attachFloatingButton();
    }
  }

  const observer = new MutationObserver(() => init());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
