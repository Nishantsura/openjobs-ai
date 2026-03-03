(() => {
  const adapter = globalThis.OpenJobsFormAdapter;
  const core = globalThis.OpenJobsCore || { normalize: (v) => String(v || '').toLowerCase().trim() };

  if (!adapter) return;

  const CONFIG_KEYS = {
    backendUrl: 'openjobsBackendUrl',
    accessToken: 'openjobsAccessToken',
    profile: 'openjobsProfile',
    featureFlags: 'openjobsFeatureFlags'
  };

  const SUPPORTED_NATIVE_DOMAINS = ['linkedin.com', 'greenhouse.io', 'lever.co', 'indeed.', 'glassdoor.', 'wellfound.com', 'angel.co'];

  const KNOWN_PATTERNS = {
    firstName: [/first\s*name/i, /given\s*name/i],
    lastName: [/last\s*name/i, /family\s*name/i, /surname/i],
    email: [/e-?mail/i],
    phone: [/phone/i, /mobile/i, /contact\s*number/i],
    linkedinUrl: [/linkedin/i, /profile\s*url/i, /portfolio/i, /website/i],
    city: [/city/i, /location/i]
  };

  function isSupportedNativeDomain() {
    const host = window.location.hostname.toLowerCase();
    return SUPPORTED_NATIVE_DOMAINS.some((d) => host.includes(d));
  }

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function extensionApiRequest(url, method, headers, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'OPENJOBS_API_REQUEST', payload: { url, method, headers, body } },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, status: 500, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response);
        }
      );
    });
  }

  function getText(el) {
    return (el?.textContent || '').trim();
  }

  function detectKnownField(control, root) {
    const id = control.getAttribute('id');
    const name = control.getAttribute('name') || '';
    const placeholder = control.getAttribute('placeholder') || '';
    const aria = control.getAttribute('aria-label') || '';
    const labelNode = id ? root.querySelector(`label[for="${id}"]`) : null;
    const label = getText(labelNode);
    const descriptor = `${name} ${placeholder} ${aria} ${label}`.toLowerCase();

    for (const [key, patterns] of Object.entries(KNOWN_PATTERNS)) {
      if (patterns.some((regex) => regex.test(descriptor))) return key;
    }

    return null;
  }

  function findBestForm() {
    const forms = Array.from(document.querySelectorAll('form'));
    const ranked = forms
      .map((form) => ({ form, count: form.querySelectorAll('input, textarea, select').length }))
      .filter((item) => item.count >= 3)
      .sort((a, b) => b.count - a.count);

    return ranked[0]?.form || null;
  }

  function addAssistButton() {
    const id = 'openjobs-assist-mode-btn';
    if (document.getElementById(id)) return;

    const button = document.createElement('button');
    button.id = id;
    button.type = 'button';
    button.textContent = 'Assist Mode';
    button.style.position = 'fixed';
    button.style.right = '16px';
    button.style.bottom = '16px';
    button.style.padding = '10px 14px';
    button.style.borderRadius = '10px';
    button.style.border = '1px solid #0a66c2';
    button.style.background = '#eaf4ff';
    button.style.color = '#0a66c2';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.style.zIndex = '2147483647';

    button.addEventListener('click', async () => {
      button.disabled = true;
      button.textContent = 'Assisting...';
      try {
        await runAssistMode();
      } finally {
        button.disabled = false;
        button.textContent = 'Assist Mode';
      }
    });

    document.body.appendChild(button);
  }

  function ensurePanel() {
    const id = 'openjobs-assist-panel';
    let panel = document.getElementById(id);
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = id;
    panel.style.position = 'fixed';
    panel.style.top = '16px';
    panel.style.right = '16px';
    panel.style.width = '360px';
    panel.style.maxHeight = '70vh';
    panel.style.overflow = 'auto';
    panel.style.background = '#ffffff';
    panel.style.border = '1px solid #d8e8fb';
    panel.style.borderRadius = '12px';
    panel.style.padding = '12px';
    panel.style.boxShadow = '0 10px 24px rgba(0,0,0,0.16)';
    panel.style.zIndex = '2147483647';

    const title = document.createElement('div');
    title.textContent = 'Assist Mode Suggestions';
    title.style.fontWeight = '700';
    title.style.color = '#183a61';
    title.style.marginBottom = '8px';
    panel.appendChild(title);

    document.body.appendChild(panel);
    return panel;
  }

  function addPanelItem(panel, question, answer) {
    const item = document.createElement('div');
    item.style.borderTop = '1px solid #e9f0fa';
    item.style.paddingTop = '8px';
    item.style.marginTop = '8px';

    const q = document.createElement('div');
    q.textContent = question;
    q.style.fontSize = '12px';
    q.style.fontWeight = '700';
    q.style.color = '#234568';

    const ta = document.createElement('textarea');
    ta.value = answer;
    ta.style.width = '100%';
    ta.style.minHeight = '80px';
    ta.style.marginTop = '6px';
    ta.style.border = '1px solid #c9dbf1';
    ta.style.borderRadius = '8px';
    ta.style.padding = '8px';
    ta.style.fontSize = '12px';

    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Copy';
    copy.style.marginTop = '6px';
    copy.style.padding = '6px 10px';
    copy.style.borderRadius = '8px';
    copy.style.border = '1px solid #0a66c2';
    copy.style.background = '#eaf4ff';
    copy.style.color = '#0a66c2';

    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(ta.value);
        copy.textContent = 'Copied';
        setTimeout(() => {
          copy.textContent = 'Copy';
        }, 1200);
      } catch (_err) {
        copy.textContent = 'Copy failed';
      }
    });

    item.appendChild(q);
    item.appendChild(ta);
    item.appendChild(copy);
    panel.appendChild(item);
  }

  function highlightUncertainField(control) {
    control.style.outline = '2px solid #f0b35f';
    control.style.outlineOffset = '1px';
    control.style.background = '#fffaf1';
  }

  async function generateAnswer(question, pageText, profile, config) {
    if (!config.backendUrl) return '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (config.accessToken) {
      headers.Authorization = `Bearer ${config.accessToken}`;
    }

    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/generate-answer`,
      'POST',
      headers,
      {
        question,
        jobDescription: pageText.slice(0, 5000),
        profile
      }
    );

    if (!response?.ok) return '';
    return response?.data?.data?.answer || '';
  }

  function extractQuestion(control, root) {
    const id = control.getAttribute('id');
    const labelNode = id ? root.querySelector(`label[for="${id}"]`) : null;
    const label = getText(labelNode);
    const placeholder = control.getAttribute('placeholder') || '';
    const aria = control.getAttribute('aria-label') || '';
    return label || placeholder || aria;
  }

  async function runAssistMode() {
    const form = findBestForm();
    if (!form) return;

    await adapter.runFormFill(form);

    const config = await storageGet([CONFIG_KEYS.backendUrl, CONFIG_KEYS.accessToken, CONFIG_KEYS.profile]);
    const profile = config[CONFIG_KEYS.profile] || {};
    const panel = ensurePanel();

    const controls = Array.from(form.querySelectorAll('input, textarea, select')).filter((control) => {
      if (control.disabled || control.readOnly) return false;
      if (control.type === 'hidden' || control.type === 'file') return false;
      return true;
    });

    const pageText = getText(document.body);

    for (const control of controls) {
      const known = detectKnownField(control, form);
      if (known) continue;

      highlightUncertainField(control);

      if (control.tagName.toLowerCase() !== 'textarea') continue;
      if (String(control.value || '').trim()) continue;

      const question = extractQuestion(control, form);
      if (!question || question.length < 8) continue;

      const answer = await generateAnswer(question, pageText, profile, {
        backendUrl: config[CONFIG_KEYS.backendUrl],
        accessToken: config[CONFIG_KEYS.accessToken]
      });

      if (!answer) {
        addPanelItem(panel, question, 'No AI suggestion available (check OpenAI key/config).');
        continue;
      }

      addPanelItem(panel, question, answer);
    }
  }

  function init() {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('supabase.com') || host.includes('vercel.app') || host === 'vercel.com') return;
    if (isSupportedNativeDomain()) return;
    storageGet([CONFIG_KEYS.featureFlags]).then((stored) => {
      const flags = stored[CONFIG_KEYS.featureFlags] || {};
      if (flags.assistModeEnabled === true) {
        addAssistButton();
      }
    });
  }

  const observer = new MutationObserver(() => init());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  init();
})();
