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
    },
    actionIntent: (text) => {
      const t = String(text || '').toLowerCase();
      if (t.includes('submit')) return 'submit';
      if (t.includes('review')) return 'review';
      if (t.includes('next') || t.includes('continue')) return 'next';
      return 'unknown';
    },
    isLikelyQuestionText: (text) => String(text || '').trim().length >= 8,
    hasValidationErrorText: (text) => /required|valid|please enter|cannot be blank|must be/i.test(String(text || ''))
  };

  const CONFIG_KEYS = {
    backendUrl: 'openjobsBackendUrl',
    accessToken: 'openjobsAccessToken',
    clientId: 'openjobsClientId',
    profile: 'openjobsProfile',
    resume: 'openjobsResume',
    entitlement: 'openjobsEntitlement'
  };

  const SESSION_KEY = 'openjobsSessionMeta';
  const RESUME_CACHE_KEY = 'openjobsResumeCache';
  const SMART_BUTTON_CLASS = 'openjobs-smart-apply-btn';
  const SMART_FEED_ACTION_CLASS = 'openjobs-smart-feed-action';
  const REVIEW_BANNER_ID = 'openjobs-review-banner';
  const STATUS_BADGE_CLASS = 'openjobs-ai-filled-badge';
  const MAX_SMART_APPLIES_PER_SESSION = 25;

  const FIELD_PATTERNS = {
    firstName: [/first\s*name/i, /given\s*name/i],
    lastName: [/last\s*name/i, /family\s*name/i, /surname/i],
    email: [/e-?mail/i],
    phone: [/phone/i, /mobile/i, /contact\s*number/i],
    linkedinUrl: [/linkedin/i, /profile\s*url/i, /portfolio/i, /website/i],
    city: [/city/i, /location/i]
  };

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function withTimeout(promise, timeoutMs, fallbackValue) {
    let timer = null;
    try {
      return await Promise.race([
        promise,
        new Promise((resolve) => {
          timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function humanDelay() {
    return 300 + Math.floor(Math.random() * 500);
  }

  function getText(el) {
    return (el?.textContent || '').trim();
  }

  function normalize(value) {
    return core.normalize(value);
  }

  function storageGet(keys) {
    return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
  }

  function storageSet(values) {
    return new Promise((resolve) => chrome.storage.local.set(values, resolve));
  }

  function extensionApiRequest(url, method, headers, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: 'OPENJOBS_API_REQUEST',
          payload: { url, method, headers, body }
        },
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

  async function getOrCreateClientId() {
    const stored = await storageGet([CONFIG_KEYS.clientId]);
    if (stored[CONFIG_KEYS.clientId]) return String(stored[CONFIG_KEYS.clientId]);

    const id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    await storageSet({ [CONFIG_KEYS.clientId]: id });
    return id;
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

  async function hashText(text) {
    if (!globalThis.crypto?.subtle) return null;
    const encoded = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async function getResumeCache() {
    const stored = await storageGet([RESUME_CACHE_KEY]);
    return stored[RESUME_CACHE_KEY] || {};
  }

  async function setResumeCache(cache) {
    await storageSet({ [RESUME_CACHE_KEY]: cache });
  }

  async function isAiEnabledForUser() {
    const stored = await storageGet([CONFIG_KEYS.entitlement]);
    const ent = stored[CONFIG_KEYS.entitlement] || {};
    if (typeof ent.aiEnabled === 'boolean') return ent.aiEnabled;
    const plan = String(ent.plan || 'FREE').toUpperCase();
    if (plan === 'PRO' || plan === 'TRIAL' || plan === 'BUSINESS' || plan === 'DEV') return true;
    // Default-on for guest beta usage; backend remains the source of truth for request success/failure.
    return true;
  }

  function isLinkedInJobPage() {
    const path = window.location.pathname;
    return path.includes('/jobs/view/') || path.includes('/jobs/search/') || path.includes('/jobs/collections/');
  }

  function isLinkedInFeedPage() {
    const path = window.location.pathname;
    return path === '/feed/' || path.startsWith('/feed') || path.startsWith('/posts/');
  }

  function extractJobDescription() {
    const selectors = [
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.jobs-description-content__text',
      '[class*="job-details"] [class*="description"]'
    ];

    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = getText(node);
      if (text.length > 80) return text;
    }

    return getText(document.body).slice(0, 4000);
  }

  function easyApplyButtons() {
    return Array.from(document.querySelectorAll('button')).filter((button) => {
      const text = normalize(getText(button));
      const aria = normalize(button.getAttribute('aria-label'));
      return text.includes('easy apply') || aria.includes('easy apply');
    });
  }

  function getModal() {
    const selectors = ['.jobs-easy-apply-modal', '.artdeco-modal[role="dialog"]', '[data-test-modal]'];

    for (const selector of selectors) {
      const modal = document.querySelector(selector);
      if (modal) return modal;
    }

    return null;
  }

  function hasCaptcha(modal) {
    const captchaNode = modal.querySelector('iframe[src*="captcha"], iframe[title*="captcha" i], [class*="captcha" i]');
    return Boolean(captchaNode);
  }

  function hasValidationBlocker(modal) {
    if (modal.querySelector('[aria-invalid="true"]')) return true;

    const messages = Array.from(
      modal.querySelectorAll(
        '.artdeco-inline-feedback__message, .fb-form-element__error, .jobs-easy-apply-form-section__grouping [role="alert"]'
      )
    );

    return messages.some((node) => core.hasValidationErrorText(getText(node)));
  }

  async function checkSessionLimit() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = await storageGet([SESSION_KEY]);
    const meta = stored[SESSION_KEY] || { date: today, count: 0 };

    if (meta.date !== today) {
      const resetMeta = { date: today, count: 0 };
      await storageSet({ [SESSION_KEY]: resetMeta });
      return { allowed: true, count: 0 };
    }

    if (meta.count >= MAX_SMART_APPLIES_PER_SESSION) return { allowed: false, count: meta.count };
    return { allowed: true, count: meta.count };
  }

  async function incrementSessionCount() {
    const today = new Date().toISOString().slice(0, 10);
    const stored = await storageGet([SESSION_KEY]);
    const meta = stored[SESSION_KEY] || { date: today, count: 0 };
    const next = meta.date === today ? { date: today, count: meta.count + 1 } : { date: today, count: 1 };
    await storageSet({ [SESSION_KEY]: next });
  }

  function showInlineNotice(message, tone = 'info') {
    const containerId = 'openjobs-inline-notice';
    let node = document.getElementById(containerId);
    if (!node) {
      node = document.createElement('div');
      node.id = containerId;
      node.style.position = 'fixed';
      node.style.right = '16px';
      node.style.bottom = '16px';
      node.style.zIndex = '2147483647';
      node.style.maxWidth = '360px';
      node.style.padding = '12px 14px';
      node.style.borderRadius = '10px';
      node.style.boxShadow = '0 8px 24px rgba(0,0,0,0.18)';
      node.style.fontSize = '13px';
      node.style.fontWeight = '600';
      node.style.lineHeight = '1.4';
      document.body.appendChild(node);
    }

    if (tone === 'error') {
      node.style.background = '#ffe8e8';
      node.style.color = '#8a1717';
    } else {
      node.style.background = '#eaf4ff';
      node.style.color = '#16406a';
    }

    node.textContent = message;
  }

  function addReviewBanner(modal) {
    if (modal.querySelector(`#${REVIEW_BANNER_ID}`)) return;

    const banner = document.createElement('div');
    banner.id = REVIEW_BANNER_ID;
    banner.textContent = 'Review and Submit: OpenJobs AI stops here. Final submission is manual.';
    banner.style.margin = '10px 0';
    banner.style.padding = '10px 12px';
    banner.style.borderRadius = '8px';
    banner.style.background = '#fff4d6';
    banner.style.color = '#5b4300';
    banner.style.fontSize = '13px';
    banner.style.fontWeight = '600';
    banner.style.border = '1px solid #f4d58d';

    const footer = modal.querySelector('.jobs-easy-apply-content__footer, .artdeco-modal__actionbar') || modal;
    footer.prepend(banner);
  }

  function detectFieldKey(control) {
    const id = control.getAttribute('id');
    const name = control.getAttribute('name');
    const placeholder = control.getAttribute('placeholder');
    const aria = control.getAttribute('aria-label');

    const modalRoot = control.closest('.jobs-easy-apply-modal, .artdeco-modal[role="dialog"], [data-test-modal]') || document;
    const labelNode = id ? modalRoot.querySelector(`label[for="${id}"]`) : null;
    const labelText = getText(labelNode);

    const descriptor = core.makeDescriptor([name, placeholder, aria, labelText]);
    return core.detectFieldKey(descriptor, FIELD_PATTERNS);
  }

  function dispatchReactInputEvents(control) {
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    control.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  async function fillControl(control, value) {
    control.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await sleep(humanDelay());

    if (control.tagName.toLowerCase() === 'select') {
      const options = Array.from(control.options || []);
      const exact = options.find((opt) => normalize(opt.textContent) === normalize(value));
      const partial = options.find((opt) => normalize(opt.textContent).includes(normalize(value)));
      const selected = exact || partial;
      if (selected) {
        control.value = selected.value;
        dispatchReactInputEvents(control);
      }
      return;
    }

    control.focus();
    control.value = value;
    dispatchReactInputEvents(control);
  }

  function toFileFromDataUrl(dataUrl, fileName) {
    const [meta, content] = String(dataUrl || '').split(',');
    if (!meta || !content) return null;

    const mimeMatch = /data:(.*?);base64/.exec(meta);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const bytes = Uint8Array.from(atob(content), (char) => char.charCodeAt(0));

    return new File([bytes], fileName || 'resume.pdf', { type: mime });
  }

  function markAsAiFilled(control) {
    control.style.outline = '2px solid #7ab8ff';
    control.style.outlineOffset = '1px';

    const siblingBadge = control.parentElement?.querySelector(`.${STATUS_BADGE_CLASS}`);
    if (siblingBadge) return;

    const badge = document.createElement('span');
    badge.className = STATUS_BADGE_CLASS;
    badge.textContent = 'AI filled';
    badge.style.display = 'inline-block';
    badge.style.marginTop = '6px';
    badge.style.padding = '3px 7px';
    badge.style.borderRadius = '10px';
    badge.style.background = '#e7f2ff';
    badge.style.color = '#0b4d8f';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = '600';

    control.parentElement?.appendChild(badge);
  }

  async function generateAnswer(question, jobDescription, profile, config) {
    if (!config.backendUrl) return '';
    const headers = await buildApiHeaders(config);

    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/generate-answer`,
      'POST',
      headers,
      { question, jobDescription, profile }
    );

    if (!response?.ok) return '';
    return response?.data?.data?.answer || '';
  }

  async function generateCoverLetterText(jobDescription, profile, config) {
    if (!config.backendUrl) return '';
    const headers = await buildApiHeaders(config);

    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/generate-cover-letter`,
      'POST',
      headers,
      { jobDescription, profile }
    );
    if (!response?.ok) return '';
    return response?.data?.data?.coverLetter || '';
  }

  async function generateEmailDraft(postContext, profile, config) {
    if (!config.backendUrl) {
      return { draft: null, error: 'Missing backend URL.' };
    }
    const headers = await buildApiHeaders(config);

    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/generate-email`,
      'POST',
      headers,
      { postContext, profile }
    );

    if (!response?.ok) {
      return {
        draft: null,
        error: response?.data?.error?.details || response?.data?.error?.message || response?.error || 'Email generation request failed.'
      };
    }

    return { draft: response?.data?.data || null, error: '' };
  }

  async function fetchOptimizedResume(jobDescription, profile, config) {
    if (!config.backendUrl) return null;
    const headers = await buildApiHeaders(config);

    const response = await extensionApiRequest(
      `${config.backendUrl.replace(/\/$/, '')}/api/optimize-resume`,
      'POST',
      headers,
      { jobDescription, profile }
    );

    if (!response?.ok) return null;
    const data = response?.data?.data;
    if (!data?.dataUrl) return null;

    return {
      jobFingerprint: data.jobFingerprint,
      dataUrl: data.dataUrl,
      fileName: data.fileName || 'optimized-resume.pdf',
      savedAt: Date.now()
    };
  }

  async function getOptimizedResume(jobDescription, profile, config) {
    const fingerprint = await hashText(jobDescription);
    const cache = await getResumeCache();

    if (fingerprint && cache[fingerprint]) {
      return cache[fingerprint];
    }

    const optimized = await fetchOptimizedResume(jobDescription, profile, config);
    if (!optimized) return null;

    const cacheKey = optimized.jobFingerprint || fingerprint;
    if (cacheKey) {
      const entries = Object.entries(cache).sort((a, b) => (a[1]?.savedAt || 0) - (b[1]?.savedAt || 0));
      const trimmed = Object.fromEntries(entries.slice(-4));
      trimmed[cacheKey] = optimized;
      await setResumeCache(trimmed);
    }

    return optimized;
  }

  function extractQuestionText(textarea) {
    const id = textarea.getAttribute('id');
    const modalRoot = textarea.closest('.jobs-easy-apply-modal, .artdeco-modal[role="dialog"], [data-test-modal]') || document;
    const labelNode = id ? modalRoot.querySelector(`label[for="${id}"]`) : null;
    const label = getText(labelNode);
    const aria = textarea.getAttribute('aria-label') || '';
    const placeholder = textarea.getAttribute('placeholder') || '';

    const candidate = label || aria || placeholder;
    return core.isLikelyQuestionText(candidate) ? candidate : '';
  }

  function isCoverLetterQuestion(question) {
    return /(cover\s*letter|why.*fit|why.*role|motivation|introduce yourself|about yourself)/i.test(String(question || ''));
  }

  async function fillKnownFields(modal, profile) {
    const controls = Array.from(modal.querySelectorAll('input, textarea, select')).filter((control) => {
      if (control.disabled || control.readOnly) return false;
      if (control.type === 'hidden' || control.type === 'file') return false;
      return true;
    });

    for (const control of controls) {
      const key = detectFieldKey(control);
      if (!key) continue;

      const value = profile?.[key];
      if (!value) continue;

      await fillControl(control, value);
      markAsAiFilled(control);
    }
  }

  async function fillScreeningQuestions(modal, profile, config) {
    const jobDescription = extractJobDescription();
    const textareas = Array.from(modal.querySelectorAll('textarea')).filter((textarea) => !textarea.value.trim());

    for (const textarea of textareas) {
      const maybeFieldKey = detectFieldKey(textarea);
      if (maybeFieldKey) continue;

      const question = extractQuestionText(textarea);
      if (!question) continue;

      await sleep(humanDelay());
      const answer = isCoverLetterQuestion(question)
        ? await generateCoverLetterText(jobDescription, profile, config)
        : await generateAnswer(question, jobDescription, profile, config);
      if (!answer) continue;

      await fillControl(textarea, answer);
      markAsAiFilled(textarea);
    }
  }

  async function uploadResume(modal, resumeConfig) {
    if (!resumeConfig?.dataUrl) return false;

    const fileInputs = Array.from(modal.querySelectorAll('input[type="file"]')).filter((input) => {
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
      dispatchReactInputEvents(input);
    }

    return true;
  }

  function getPrimaryActionButton(modal) {
    const selectors = [
      '.jobs-easy-apply-content__footer button.artdeco-button--primary',
      '.artdeco-modal__actionbar button.artdeco-button--primary',
      'button.artdeco-button--primary'
    ];

    for (const selector of selectors) {
      const button = modal.querySelector(selector);
      if (button && !button.disabled) return button;
    }

    return null;
  }

  async function waitForModal(timeoutMs = 12000) {
    const immediate = getModal();
    if (immediate) return immediate;

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeoutMs);

      const observer = new MutationObserver(() => {
        const modal = getModal();
        if (!modal) return;

        window.clearTimeout(timeout);
        observer.disconnect();
        resolve(modal);
      });

      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  async function runSmartApply(nativeButton) {
    const session = await checkSessionLimit();
    if (!session.allowed) {
      showInlineNotice('Session limit reached (25 Smart Applies). Please continue manually.', 'error');
      return;
    }

    const config = await storageGet([
      CONFIG_KEYS.backendUrl,
      CONFIG_KEYS.accessToken,
      CONFIG_KEYS.profile,
      CONFIG_KEYS.resume
    ]);

    const profile = config[CONFIG_KEYS.profile] || {};
    const baseResume = config[CONFIG_KEYS.resume] || null;
    const jobDescription = extractJobDescription();
    const optimizedResume = await withTimeout(
      getOptimizedResume(jobDescription, profile, {
        backendUrl: config[CONFIG_KEYS.backendUrl],
        accessToken: config[CONFIG_KEYS.accessToken]
      }),
      9000,
      null
    );
    const resume = optimizedResume || baseResume;

    nativeButton.click();
    const modal = await waitForModal();

    if (!modal) {
      showInlineNotice('Easy Apply modal was not detected in time.', 'error');
      return;
    }

    if (hasCaptcha(modal)) {
      showInlineNotice('CAPTCHA detected. Smart Apply paused for safety.', 'error');
      addReviewBanner(modal);
      return;
    }

    const safetyStepLimit = 18;

    for (let step = 0; step < safetyStepLimit; step += 1) {
      await withTimeout(fillKnownFields(modal, profile), 7000, null);
      await uploadResume(modal, resume);
      await withTimeout(
        fillScreeningQuestions(modal, profile, {
          backendUrl: config[CONFIG_KEYS.backendUrl],
          accessToken: config[CONFIG_KEYS.accessToken]
        }),
        14000,
        null
      );

      if (hasValidationBlocker(modal)) {
        addReviewBanner(modal);
        showInlineNotice('Validation issues need review before continuing.', 'error');
        await incrementSessionCount();
        return;
      }

      const actionButton = getPrimaryActionButton(modal);
      if (!actionButton) break;

      const buttonText = getText(actionButton) || actionButton.getAttribute('aria-label');
      const intent = core.actionIntent(buttonText);

      if (intent === 'submit') {
        addReviewBanner(modal);
        showInlineNotice('Ready to submit. Please review and submit manually.');
        await incrementSessionCount();
        return;
      }

      if (intent === 'next' || intent === 'review') {
        actionButton.click();
        await sleep(900);

        if (hasCaptcha(modal)) {
          addReviewBanner(modal);
          showInlineNotice('CAPTCHA detected. Smart Apply paused for safety.', 'error');
          return;
        }

        if (hasValidationBlocker(modal)) {
          addReviewBanner(modal);
          showInlineNotice('LinkedIn shows field errors. Please review manually.', 'error');
          await incrementSessionCount();
          return;
        }

        continue;
      }

      addReviewBanner(modal);
      showInlineNotice('Unknown step detected. Switched to manual-safe mode.');
      await incrementSessionCount();
      return;
    }

    addReviewBanner(modal);
    showInlineNotice('Partial automation completed. Please review fields before submit.');
    await incrementSessionCount();
  }

  function injectSmartButton(nativeButton) {
    if (!nativeButton || nativeButton.dataset.openjobsBound === '1') return;
    nativeButton.dataset.openjobsBound = '1';

    const smartButton = document.createElement('button');
    smartButton.type = 'button';
    smartButton.className = SMART_BUTTON_CLASS;
    smartButton.textContent = 'Smart Apply';
    smartButton.style.marginLeft = '8px';
    smartButton.style.padding = '10px 14px';
    smartButton.style.borderRadius = '999px';
    smartButton.style.border = '1px solid #0a66c2';
    smartButton.style.background = '#eaf4ff';
    smartButton.style.color = '#0a66c2';
    smartButton.style.fontWeight = '700';
    smartButton.style.cursor = 'pointer';

    smartButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      smartButton.disabled = true;
      smartButton.textContent = 'Applying...';

      try {
        await runSmartApply(nativeButton);
      } catch (error) {
        console.error('[OpenJobs] Smart Apply failed', error);
        const details = error instanceof Error ? error.message : 'Unknown runtime error';
        showInlineNotice(`Smart Apply failed: ${details}`, 'error');
      } finally {
        smartButton.disabled = false;
        smartButton.textContent = 'Smart Apply';
      }
    });

    nativeButton.insertAdjacentElement('afterend', smartButton);
  }

  function extractEmails(text) {
    const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g) || [];
    return [...new Set(matches.map((email) => email.trim()))];
  }

  function shouldShowSmartEmail(text) {
    return extractEmails(text).length > 0;
  }

  function showFeedDebug(reason) {
    if (localStorage.getItem('openjobs_debug_feed') !== '1') return;
    showInlineNotice(`Feed debug: ${reason}`, 'error');
  }

  function getFeedPostNodes() {
    const selectors = [
      'div.feed-shared-update-v2',
      'div[data-view-name="feed-full-update"]',
      'div[data-view-name="feed-update-pill"]',
      'div[data-view-name="feed-commentary"]',
      'div[data-view-name*="feed-"]',
      'div[data-id^="urn:li:activity:"]',
      'div.occludable-update',
      'article'
    ];

    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const filtered = nodes.filter((node) => getText(node).length > 40);
      if (filtered.length) return filtered;
    }

    return [];
  }

  function getPostText(node) {
    const candidates = [
      '.update-components-text',
      '.feed-shared-update-v2__description',
      '.feed-shared-inline-show-more-text',
      '.update-components-update-v2__commentary',
      '.break-words',
      '[data-test-id*=\"main-feed-activity-card\"]'
    ];

    for (const selector of candidates) {
      const text = getText(node.querySelector(selector));
      if (text.length > 20) return text;
    }

    return getText(node).slice(0, 4000);
  }

  function findOrCreateFeedActionRow(postNode) {
    let row = postNode.querySelector('.openjobs-feed-actions');
    if (row) return row;

    row = document.createElement('div');
    row.className = 'openjobs-feed-actions';
    row.style.display = 'flex';
    row.style.gap = '8px';
    row.style.marginTop = '8px';
    row.style.flexWrap = 'wrap';

    const socialBar =
      postNode.querySelector('.feed-shared-social-action-bar') ||
      postNode.querySelector('.feed-shared-social-actions') ||
      postNode.querySelector('[aria-label*="reaction" i]')?.closest('div') ||
      postNode.querySelector('[data-view-name="feed-update-pill"]') ||
      postNode.querySelector('[data-view-name="feed-commentary"]');

    if (socialBar && socialBar.parentElement) {
      socialBar.parentElement.insertBefore(row, socialBar);
      return row;
    }

    postNode.appendChild(row);
    return row;
  }

  function ensureFeedFloatingActions() {
    if (localStorage.getItem('openjobs_feed_floating') !== '1') return;
    const id = 'openjobs-feed-floating-actions';
    if (document.getElementById(id)) return;

    const wrap = document.createElement('div');
    wrap.id = id;
    wrap.style.position = 'fixed';
    wrap.style.right = '16px';
    wrap.style.bottom = '64px';
    wrap.style.display = 'flex';
    wrap.style.gap = '8px';
    wrap.style.flexWrap = 'wrap';
    wrap.style.zIndex = '2147483647';

    const emailBtn = makeFeedActionButton('Smart Email');

    emailBtn.addEventListener('click', async () => {
      emailBtn.disabled = true;
      emailBtn.textContent = 'Scanning...';
      try {
        const posts = getFeedPostNodes();
        const candidate = posts
          .map((p) => ({ node: p, text: getPostText(p) }))
          .find((p) => shouldShowSmartEmail(p.text));

        if (!candidate) {
          showInlineNotice('No email hiring post detected in current feed view.', 'error');
          return;
        }

        const emails = extractEmails(candidate.text);
        const config = await storageGet([CONFIG_KEYS.backendUrl, CONFIG_KEYS.accessToken, CONFIG_KEYS.profile]);
        const result = await generateEmailDraft(candidate.text, config[CONFIG_KEYS.profile] || {}, {
          backendUrl: config[CONFIG_KEYS.backendUrl],
          accessToken: config[CONFIG_KEYS.accessToken]
        });

        const draft = result?.draft;
        if (!draft?.subject || !draft?.body) {
          showInlineNotice(result?.error || 'Could not generate email draft.', 'error');
          return;
        }

        const compose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
          emails[0]
        )}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
        window.open(compose, '_blank');
        showInlineNotice('Gmail draft opened. Please review and send manually.');
      } catch (_err) {
        showInlineNotice('Smart Email failed. Please draft manually.', 'error');
      } finally {
        emailBtn.disabled = false;
        emailBtn.textContent = 'Smart Email';
      }
    });

    wrap.appendChild(emailBtn);
    document.body.appendChild(wrap);
  }

  function makeFeedActionButton(label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = SMART_FEED_ACTION_CLASS;
    button.textContent = label;
    button.style.padding = '6px 10px';
    button.style.borderRadius = '999px';
    button.style.border = '1px solid #0a66c2';
    button.style.background = '#eaf4ff';
    button.style.color = '#0a66c2';
    button.style.fontWeight = '700';
    button.style.cursor = 'pointer';
    button.style.fontSize = '12px';
    return button;
  }

  function injectFeedActions(postNode, postText) {
    if (postNode.dataset.openjobsFeedBound === '1') return;
    postNode.dataset.openjobsFeedBound = '1';

    const emails = extractEmails(postText);
    const showEmail = emails.length > 0;
    if (!showEmail) return;

    const row = findOrCreateFeedActionRow(postNode);
    if (!row) return;

    if (showEmail) {
      const emailButton = makeFeedActionButton('Smart Email');
      emailButton.addEventListener('click', async () => {
        emailButton.disabled = true;
        emailButton.textContent = 'Generating...';

        try {
          const config = await storageGet([CONFIG_KEYS.backendUrl, CONFIG_KEYS.accessToken, CONFIG_KEYS.profile]);
          const result = await generateEmailDraft(postText, config[CONFIG_KEYS.profile] || {}, {
            backendUrl: config[CONFIG_KEYS.backendUrl],
            accessToken: config[CONFIG_KEYS.accessToken]
          });

          const draft = result?.draft;
          if (!draft?.subject || !draft?.body) {
            showInlineNotice(result?.error || 'Could not generate email draft.', 'error');
            return;
          }

          const to = emails[0];
          const compose = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(
            draft.subject
          )}&body=${encodeURIComponent(draft.body)}`;
          window.open(compose, '_blank');
          showInlineNotice('Gmail draft opened. Please review and send manually.');
        } catch (_err) {
          showInlineNotice('Smart Email failed. Please draft manually.', 'error');
        } finally {
          emailButton.disabled = false;
          emailButton.textContent = 'Smart Email';
        }
      });
      row.appendChild(emailButton);
    }

  }

  function scanAndInject() {
    if (isLinkedInJobPage()) {
      easyApplyButtons().forEach((button) => injectSmartButton(button));
    }

    if (isLinkedInFeedPage()) {
      ensureFeedFloatingActions();
      const posts = getFeedPostNodes();
      posts.forEach((post) => {
        const text = getPostText(post);
        if (text.length < 30) return;
        if (!shouldShowSmartEmail(text)) {
          showFeedDebug('no email detected');
          return;
        }
        injectFeedActions(post, text);
      });
    }
  }

  const observer = new MutationObserver(() => {
    try {
      scanAndInject();
    } catch (error) {
      console.error('[OpenJobs] scanAndInject failed', error);
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', scanAndInject);
  try {
    scanAndInject();
  } catch (error) {
    console.error('[OpenJobs] initial scan failed', error);
  }
})();
