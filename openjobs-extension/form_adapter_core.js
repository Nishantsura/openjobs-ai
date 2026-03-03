(() => {
  const core = globalThis.OpenJobsCore || {
    normalize: (v) => String(v || '').toLowerCase().trim(),
    makeDescriptor: (parts) => String(parts.filter(Boolean).join(' ')).toLowerCase().trim(),
    detectFieldKey: (descriptor, patterns) => {
      const d = String(descriptor || '').toLowerCase().trim();
      for (const [key, regexList] of Object.entries(patterns)) {
        if (regexList.some((regex) => regex.test(d))) return key;
      }
      return null;
    }
  };

  const CONFIG_KEYS = {
    backendUrl: 'openjobsBackendUrl',
    accessToken: 'openjobsAccessToken',
    clientId: 'openjobsClientId',
    profile: 'openjobsProfile',
    resume: 'openjobsResume',
    featureFlags: 'openjobsFeatureFlags'
  };

  const FIELD_PATTERNS = {
    firstName: [/first\s*name/i, /given\s*name/i],
    lastName: [/last\s*name/i, /family\s*name/i, /surname/i],
    email: [/e-?mail/i],
    phone: [/phone/i, /mobile/i, /contact\s*number/i],
    linkedinUrl: [/linkedin/i, /profile\s*url/i, /portfolio/i, /website/i],
    city: [/city/i, /location/i, /current\s*location/i],
    expectedSalaryRange: [/expected.*salary/i, /salary.*expect/i, /ctc.*expect/i, /compensation.*expect/i],
    noticePeriod: [/notice/i, /joining.*time/i],
    workAuthorization: [/work.*authorization/i, /visa/i, /sponsorship/i],
    portfolioUrl: [/portfolio/i, /website/i, /github/i],
    linkedinHeadlineSummary: [/headline/i, /summary/i],
    totalYearsExperience: [/total.*experience/i, /years.*experience/i]
  };
  const COVER_LETTER_PATTERNS = [
    /cover\s*letter/i,
    /tell us why/i,
    /why should we/i,
    /why do you want/i,
    /why are you interested/i,
    /why.*fit/i,
    /why.*role/i,
    /motivation/i,
    /about\s*you/i,
    /introduce\s*yourself/i,
    /message to hiring manager/i
  ];

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function getOrCreateClientId() {
    return new Promise((resolve) => {
      chrome.storage.local.get([CONFIG_KEYS.clientId], (result) => {
        if (result[CONFIG_KEYS.clientId]) {
          resolve(String(result[CONFIG_KEYS.clientId]));
          return;
        }
        const id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
        chrome.storage.local.set({ [CONFIG_KEYS.clientId]: id }, () => resolve(id));
      });
    });
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function humanDelay() {
    return 250 + Math.floor(Math.random() * 450);
  }

  function getText(el) {
    return (el?.textContent || '').trim();
  }

  function normalize(value) {
    return core.normalize(value);
  }

  async function extensionApiRequest(url, method, headers, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'OPENJOBS_API_REQUEST',
          payload: { url, method, headers, body }
        },
        (response) => {
          const runtimeError = chrome.runtime?.lastError;
          if (runtimeError) {
            resolve({ ok: false, status: 500, error: runtimeError.message || 'Runtime messaging failed' });
            return;
          }
          resolve({
            ok: Boolean(response?.ok),
            status: Number(response?.status || 500),
            data: response?.data || null,
            error: response?.error || null
          });
        }
      );
    });
  }

  async function buildApiHeaders(config) {
    const clientId = await getOrCreateClientId();
    const headers = {
      'Content-Type': 'application/json',
      'x-openjobs-client-id': clientId
    };
    if (config?.accessToken) {
      headers.Authorization = `Bearer ${config.accessToken}`;
    }
    return headers;
  }

  function descriptorForControl(control, root) {
    const id = control.getAttribute('id');
    const name = control.getAttribute('name');
    const placeholder = control.getAttribute('placeholder');
    const aria = control.getAttribute('aria-label');
    const labelNode = id ? root.querySelector(`label[for="${id}"]`) : null;
    const labelText = getText(labelNode);
    return core.makeDescriptor([name, placeholder, aria, labelText]);
  }

  function nearbyPromptText(control) {
    const container =
      control.closest('label, .form-group, .field, .application-question, .question, [data-testid*="question"]') ||
      control.parentElement;
    if (!container) return '';
    const text = getText(container).slice(0, 300);
    return core.normalize(text);
  }

  function detectFieldKey(control, root) {
    const descriptor = descriptorForControl(control, root);
    return core.detectFieldKey(descriptor, FIELD_PATTERNS);
  }

  function findCoverLetterField(root) {
    const controls = Array.from(root.querySelectorAll('textarea, [contenteditable="true"], input[type="text"]'));
    for (const control of controls) {
      const descriptor = `${descriptorForControl(control, root)} ${nearbyPromptText(control)}`;
      if (!descriptor) continue;
      if (COVER_LETTER_PATTERNS.some((rx) => rx.test(descriptor))) return control;
    }
    // Fallback: some editors expose no labels, but field names contain motivation/why/about.
    const broad = Array.from(root.querySelectorAll('textarea[name], textarea[id], [contenteditable="true"]'));
    for (const control of broad) {
      const tag = `${control.getAttribute('name') || ''} ${control.getAttribute('id') || ''} ${nearbyPromptText(control)}`;
      if (/cover|motivation|why|about|intro|message/i.test(tag)) return control;
    }
    return null;
  }

  function getJobContext(root) {
    const direct = getText(document.querySelector('[data-testid*="description"], .description, .job-description, .posting'));
    if (direct.length > 120) return direct.slice(0, 5000);
    return getText(root).slice(0, 5000);
  }

  async function generateCoverLetter(jobDescription, profile, config) {
    if (!config?.backendUrl) return '';
    const headers = await buildApiHeaders(config);
    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/generate-cover-letter`,
      'POST',
      headers,
      { jobDescription, profile }
    );
    if (!response?.ok) return '';
    return String(response?.data?.data?.coverLetter || '').trim();
  }

  function dispatchInputEvents(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    control.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function fillControl(control, value) {
    let changed = false;
    control.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(humanDelay());

    if (control.tagName.toLowerCase() === 'select') {
      const options = Array.from(control.options || []);
      const exact = options.find((opt) => normalize(opt.textContent) === normalize(value));
      const partial = options.find((opt) => normalize(opt.textContent).includes(normalize(value)));
      const selected = exact || partial;
      if (selected) {
        const before = String(control.value || '');
        control.value = selected.value;
        dispatchInputEvents(control);
        changed = before !== String(control.value || '');
      }
      return changed;
    }

    if (control.getAttribute('contenteditable') === 'true') {
      const before = String(control.textContent || '');
      control.focus();
      control.textContent = value;
      dispatchInputEvents(control);
      changed = before !== String(control.textContent || '');
      return changed;
    }

    const before = String(control.value || '');
    control.focus();
    control.value = value;
    dispatchInputEvents(control);
    changed = before !== String(control.value || '');
    return changed;
  }

  function toFileFromDataUrl(dataUrl, fileName) {
    const [meta, content] = String(dataUrl || '').split(',');
    if (!meta || !content) return null;

    const mimeMatch = /data:(.*?);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bytes = Uint8Array.from(atob(content), (char) => char.charCodeAt(0));

    return new File([bytes], fileName || 'resume.pdf', { type: mime });
  }

  async function uploadResume(root, resumeConfig) {
    if (!resumeConfig?.dataUrl) return false;

    const fileInputs = Array.from(root.querySelectorAll('input[type="file"]')).filter((input) => {
      const accept = normalize(input.getAttribute('accept'));
      return !accept || accept.includes('pdf') || accept.includes('application');
    });

    if (!fileInputs.length) return false;

    const file = toFileFromDataUrl(resumeConfig.dataUrl, resumeConfig.fileName || 'resume.pdf');
    if (!file) return false;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    for (const input of fileInputs) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await sleep(humanDelay());
      input.files = dataTransfer.files;
      dispatchInputEvents(input);
    }

    return true;
  }

  async function runFormFill(form) {
    const config = await storageGet([
      CONFIG_KEYS.backendUrl,
      CONFIG_KEYS.accessToken,
      CONFIG_KEYS.profile,
      CONFIG_KEYS.resume,
      CONFIG_KEYS.featureFlags
    ]);
    const profile = config[CONFIG_KEYS.profile] || {};
    const resume = config[CONFIG_KEYS.resume] || null;

    let filledFields = 0;
    let coverLetterFilled = false;
    let coverLetterDetected = false;
    const controls = Array.from(form.querySelectorAll('input, textarea, select')).filter((control) => {
      if (control.disabled || control.readOnly) return false;
      if (control.type === 'hidden' || control.type === 'file') return false;
      return true;
    });

    for (const control of controls) {
      const key = detectFieldKey(control, form);
      if (!key) continue;

      const value = profile?.[key];
      if (!value) continue;

      const changed = await fillControl(control, value);
      if (changed) filledFields += 1;
    }

    const resumeUploaded = await uploadResume(form, resume);

    const flags = config[CONFIG_KEYS.featureFlags] || {};
    const coverLetterEnabled = flags.coverLetterAutoFill !== false;
    if (coverLetterEnabled) {
      const coverField = findCoverLetterField(form);
      coverLetterDetected = Boolean(coverField);
      const currentValue = coverField ? normalize(coverField.value || coverField.textContent || '') : '';
      if (coverField && !currentValue) {
        const jobDescription = getJobContext(form);
        const coverLetter = await generateCoverLetter(jobDescription, profile, {
          backendUrl: config[CONFIG_KEYS.backendUrl],
          accessToken: config[CONFIG_KEYS.accessToken]
        });
        if (coverLetter) {
          coverLetterFilled = await fillControl(coverField, coverLetter);
        }
      }
    }

    return {
      filledFields,
      resumeUploaded,
      coverLetterDetected,
      coverLetterFilled
    };
  }

  function createButton(className, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.style.margin = '10px 0';
    button.style.padding = '10px 14px';
    button.style.borderRadius = '8px';
    button.style.border = '1px solid #0a66c2';
    button.style.background = '#eaf4ff';
    button.style.color = '#0a66c2';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.style.zIndex = '2147483646';
    return button;
  }

  function showToast(message, tone = 'info') {
    const id = 'openjobs-platform-toast';
    let node = document.getElementById(id);
    if (!node) {
      node = document.createElement('div');
      node.id = id;
      node.style.position = 'fixed';
      node.style.right = '16px';
      node.style.bottom = '16px';
      node.style.padding = '10px 12px';
      node.style.borderRadius = '8px';
      node.style.fontSize = '12px';
      node.style.fontWeight = '600';
      node.style.maxWidth = '320px';
      node.style.zIndex = '2147483647';
      document.body.appendChild(node);
    }

    if (tone === 'error') {
      node.style.background = '#ffe8e8';
      node.style.color = '#8a1717';
    } else {
      node.style.background = '#eaf4ff';
      node.style.color = '#154573';
    }

    node.textContent = message;
  }

  globalThis.OpenJobsFormAdapter = {
    createButton,
    runFormFill,
    showToast,
    sleep
  };
})();
