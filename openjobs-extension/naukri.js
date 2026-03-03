(() => {
  const selectors = globalThis.OpenJobsSelectors;
  const adapter = globalThis.OpenJobsFormAdapter;
  if (!selectors || !adapter) return;

  const SMART_CLASS = 'openjobs-smart-apply-naukri';
  const FLOATING_ID = 'openjobs-smart-apply-naukri-floating';
  const FEATURE_FLAGS_KEY = 'openjobsFeatureFlags';

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  async function isNaukriBetaEnabled() {
    const config = await storageGet([FEATURE_FLAGS_KEY]);
    return Boolean(config[FEATURE_FLAGS_KEY]?.naukriBetaEnabled);
  }

  function findForm() {
    return selectors.findNaukriForm(document);
  }

  async function run(form) {
    return adapter.runFormFill(form);
  }

  function attachFormButton(form) {
    if (!form || form.querySelector(`.${SMART_CLASS}`)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply (Beta)');
    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Applying...';
      try {
        await run(form);
        adapter.showToast('Naukri beta fill complete. Review before submit.');
      } catch (_err) {
        adapter.showToast('Smart Apply beta failed on Naukri. Continue manually.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Smart Apply (Beta)';
      }
    });

    form.prepend(button);
  }

  function attachFloatingButton() {
    if (document.getElementById(FLOATING_ID)) return;

    const button = adapter.createButton(SMART_CLASS, 'Smart Apply (Beta)');
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
          adapter.showToast('No Naukri application form detected on this page.', 'error');
          return;
        }
        await run(form);
        adapter.showToast('Naukri beta fill complete. Review before submit.');
      } catch (_err) {
        adapter.showToast('Smart Apply beta failed on Naukri. Continue manually.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Smart Apply (Beta)';
      }
    });

    document.body.appendChild(button);
  }

  async function init() {
    const enabled = await isNaukriBetaEnabled();
    if (!enabled) return;

    const form = findForm();
    if (form) attachFormButton(form);
    attachFloatingButton();
  }

  const observer = new MutationObserver(() => init());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();

