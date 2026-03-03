(() => {
  const selectors = globalThis.OpenJobsSelectors;
  const adapter = globalThis.OpenJobsFormAdapter;
  if (!selectors || !adapter) return;

  const SMART_CLASS = 'openjobs-smart-apply-lever';
  const FLOATING_ID = 'openjobs-smart-apply-lever-floating';

  function findForm() {
    return selectors.findLeverForm(document);
  }

  function run(form) {
    return adapter.runFormFill(form);
  }

  function attachFormButton(form) {
    if (!form || form.querySelector(`.${SMART_CLASS}`)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Applying...';
      try {
        await run(form);
        adapter.showToast('Lever form filled. Review and submit manually.');
      } catch (_err) {
        adapter.showToast('Smart Apply failed on Lever. Continue manually.', 'error');
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
        const form = findForm();
        if (!form) {
          adapter.showToast('No Lever application form detected on this page.', 'error');
          return;
        }
        await run(form);
        adapter.showToast('Lever form filled. Review and submit manually.');
      } catch (_err) {
        adapter.showToast('Smart Apply failed on Lever. Continue manually.', 'error');
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
