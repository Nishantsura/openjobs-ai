const keys = {
  backendUrl: 'openjobsBackendUrl',
  accessToken: 'openjobsAccessToken',
  clientId: 'openjobsClientId',
  profile: 'openjobsProfile',
  resume: 'openjobsResume',
  entitlement: 'openjobsEntitlement',
  featureFlags: 'openjobsFeatureFlags',
  debugUnlocked: 'openjobsDebugUnlocked'
};

const BUILD_TAG = 'popup-2026-03-03-3';
const DEBUG_PASSPHRASE = 'openjobs-dev-unlock';

const appTitleEl = document.getElementById('appTitle');
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const debugPanelEl = document.getElementById('debugPanel');
const signinEmailEl = document.getElementById('signinEmail');
const googleBtn = document.getElementById('googleBtn');
const magicBtn = document.getElementById('magicBtn');
const resumeFileEl = document.getElementById('resumeFile');
const resumeInfoEl = document.getElementById('resumeInfo');
const parseResumeBtn = document.getElementById('parseResumeBtn');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const firstNameEl = document.getElementById('firstName');
const lastNameEl = document.getElementById('lastName');
const emailEl = document.getElementById('email');
const phoneEl = document.getElementById('phone');
const linkedinUrlEl = document.getElementById('linkedinUrl');
const cityEl = document.getElementById('city');
const expectedSalaryRangeEl = document.getElementById('expectedSalaryRange');
const backendUrlEl = document.getElementById('backendUrl');
const accessTokenEl = document.getElementById('accessToken');
const reloadTabBtn = document.getElementById('reloadTabBtn');
const reloadExtBtn = document.getElementById('reloadExtBtn');

let taps = 0;
let resumeData = null;

function setStatus(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.style.color = tone === 'ok' ? '#1f6a2f' : tone === 'error' ? '#8a1717' : tone === 'warn' ? '#8a5c17' : '#5b6f87';
}

function setDebug(message) {
  if (debugEl) debugEl.textContent = message;
}

function getStorage(keysToRead) {
  return new Promise((resolve) => chrome.storage.local.get(keysToRead, resolve));
}

function setStorage(payload) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(payload, () => {
      const err = chrome.runtime?.lastError;
      if (err) return reject(new Error(err.message || 'Storage write failed'));
      resolve();
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function getOrCreateClientId() {
  return new Promise((resolve) => {
    chrome.storage.local.get([keys.clientId], (result) => {
      if (result[keys.clientId]) return resolve(String(result[keys.clientId]));
      const id = `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      chrome.storage.local.set({ [keys.clientId]: id }, () => resolve(id));
    });
  });
}

function callApi(url, method, headers, body) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'OPENJOBS_API_REQUEST',
        payload: { url, method, headers, body }
      },
      (response) => {
        const runtimeError = chrome.runtime?.lastError;
        if (runtimeError) return resolve({ ok: false, status: 500, error: runtimeError.message });
        resolve({
          ok: Boolean(response?.ok),
          status: Number(response?.status || 500),
          data: response?.data || null,
          error: response?.error || null,
          resolvedUrl: response?.resolvedUrl || url
        });
      }
    );
  });
}

async function authHeaders(token) {
  const clientId = await getOrCreateClientId();
  const headers = { 'Content-Type': 'application/json', 'x-openjobs-client-id': clientId };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function applyProfile(profile = {}) {
  firstNameEl.value = profile.firstName || '';
  lastNameEl.value = profile.lastName || '';
  emailEl.value = profile.email || '';
  phoneEl.value = profile.phone || '';
  linkedinUrlEl.value = profile.linkedinUrl || '';
  cityEl.value = profile.city || '';
  expectedSalaryRangeEl.value = profile.expectedSalaryRange || '';
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
}

async function loadExisting() {
  const stored = await getStorage([
    keys.backendUrl,
    keys.accessToken,
    keys.profile,
    keys.resume,
    keys.featureFlags,
    keys.debugUnlocked
  ]);
  backendUrlEl.value = stored[keys.backendUrl] || 'https://openjobs-backend-6lyr94s9c-suras-projects-1078d583.vercel.app';
  accessTokenEl.value = stored[keys.accessToken] || '';
  applyProfile(stored[keys.profile] || {});
  const resume = stored[keys.resume];
  if (resume?.fileName) {
    resumeData = resume;
    resumeInfoEl.textContent = `Loaded: ${resume.fileName}`;
  }
  const featureFlags = stored[keys.featureFlags] || {};
  const debugAllowed = !Object.prototype.hasOwnProperty.call(chrome.runtime.getManifest(), 'update_url') || featureFlags.internalSupport === true;
  debugPanelEl.style.display = debugAllowed && stored[keys.debugUnlocked] === true ? 'block' : 'none';
  setDebug(`build=${BUILD_TAG}`);
}

appTitleEl.addEventListener('click', async () => {
  taps += 1;
  if (taps < 7) return;
  taps = 0;
  const input = window.prompt('Enter debug passphrase');
  if (input !== DEBUG_PASSPHRASE) {
    setStatus('Invalid debug passphrase.', 'error');
    return;
  }
  await setStorage({ [keys.debugUnlocked]: true });
  debugPanelEl.style.display = 'block';
  setStatus('Debug panel unlocked.', 'ok');
});

googleBtn.addEventListener('click', async () => {
  const backend = backendUrlEl.value.trim() || 'http://localhost:3000';
  const email = signinEmailEl.value.trim() || 'placeholder@example.com';
  setStatus('Starting Google sign in...', 'info');
  const headers = await authHeaders(null);
  const res = await callApi(`${backend.replace(/\/$/, '')}/api/auth/session-exchange`, 'POST', headers, {
    mode: 'google_oauth',
    email
  });
  const oauthUrl = res?.data?.data?.url;
  if (!res.ok || !oauthUrl) {
    const details = String(res?.data?.error?.details || res?.data?.error?.message || res.error || '');
    if (/provider is not enabled/i.test(details)) {
      setStatus('Google sign-in is disabled in Supabase. Enable Google provider in Auth > Providers.', 'error');
    } else {
      setStatus('Google sign in init failed. Use magic link.', 'warn');
    }
    setDebug(`google_signin_status=${res.status} err=${details}`);
    return;
  }
  chrome.tabs.create({ url: oauthUrl });
  setStatus('Google sign in opened in new tab. Return here after login.', 'ok');
});

magicBtn.addEventListener('click', async () => {
  const backend = backendUrlEl.value.trim() || 'http://localhost:3000';
  const email = signinEmailEl.value.trim();
  if (!email) {
    setStatus('Enter email for magic link.', 'error');
    return;
  }
  const headers = await authHeaders(null);
  const res = await callApi(`${backend.replace(/\/$/, '')}/api/auth/session-exchange`, 'POST', headers, {
    mode: 'magic_link',
    email
  });
  if (!res.ok) {
    setStatus('Magic link failed.', 'error');
    return;
  }
  setStatus('Magic link sent. Continue with resume upload.', 'ok');
});

resumeFileEl.addEventListener('change', async () => {
  const file = resumeFileEl.files?.[0];
  if (!file) return;
  if (file.type !== 'application/pdf') {
    setStatus('Only PDF resumes are supported.', 'error');
    return;
  }
  const dataUrl = await fileToDataUrl(file);
  resumeData = { fileName: file.name, dataUrl, savedAt: Date.now() };
  await setStorage({ [keys.resume]: resumeData });
  resumeInfoEl.textContent = `Ready: ${file.name}`;
  setStatus('Resume loaded.', 'ok');
});

parseResumeBtn.addEventListener('click', async () => {
  const file = resumeFileEl.files?.[0];
  if (!file) {
    setStatus('Please choose resume PDF first.', 'error');
    return;
  }
  const backend = backendUrlEl.value.trim() || 'http://localhost:3000';
  const token = accessTokenEl.value.trim();
  const clientId = await getOrCreateClientId();
  const headers = { 'x-openjobs-client-id': clientId };
  if (token) headers.Authorization = `Bearer ${token}`;

  parseResumeBtn.disabled = true;
  parseResumeBtn.textContent = 'Parsing...';
  try {
    const form = new FormData();
    form.append('resume', file);
    const response = await fetch(`${backend.replace(/\/$/, '')}/api/parse-resume`, { method: 'POST', headers, body: form });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok) {
      setStatus('Resume parse failed. You can still fill fields manually.', 'warn');
      setDebug(`parse_status=${response.status} err=${payload?.error?.message || ''}`);
      return;
    }
    const parsed = payload.data.profile || {};
    const name = splitName(parsed.name);
    const profile = {
      firstName: firstNameEl.value.trim() || name.firstName,
      lastName: lastNameEl.value.trim() || name.lastName,
      email: emailEl.value.trim() || parsed.email || signinEmailEl.value.trim(),
      phone: phoneEl.value.trim() || parsed.phone || '',
      linkedinUrl: linkedinUrlEl.value.trim() || parsed.linkedinUrl || '',
      city: cityEl.value.trim() || parsed.city || '',
      expectedSalaryRange: expectedSalaryRangeEl.value.trim()
    };
    applyProfile(profile);
    await setStorage({ [keys.profile]: profile });
    setStatus('Resume parsed and fields autofilled.', 'ok');
  } catch (_err) {
    setStatus('Resume parse request failed.', 'error');
  } finally {
    parseResumeBtn.disabled = false;
    parseResumeBtn.textContent = 'Parse Resume & Autofill';
  }
});

saveProfileBtn.addEventListener('click', async () => {
  const profile = {
    firstName: firstNameEl.value.trim(),
    lastName: lastNameEl.value.trim(),
    email: emailEl.value.trim(),
    phone: phoneEl.value.trim(),
    linkedinUrl: linkedinUrlEl.value.trim(),
    city: cityEl.value.trim(),
    expectedSalaryRange: expectedSalaryRangeEl.value.trim()
  };
  if (!profile.firstName || !profile.lastName || !profile.email || !profile.phone || !profile.city) {
    setStatus('Please fill first name, last name, email, phone, and city.', 'error');
    return;
  }
  const backend = backendUrlEl.value.trim() || 'http://localhost:3000';
  const token = accessTokenEl.value.trim();
  await setStorage({
    [keys.backendUrl]: backend,
    [keys.accessToken]: token,
    [keys.profile]: profile,
    [keys.entitlement]: { plan: 'PRO', status: 'active', aiEnabled: true, reason: 'local-onboarding' }
  });

  const headers = await authHeaders(token);
  const res = await callApi(`${backend.replace(/\/$/, '')}/api/onboarding/profile`, 'POST', headers, {
    ...profile,
    preferredLocations: [],
    workMode: 'hybrid',
    noticePeriod: '',
    workAuthorization: '',
    willingToRelocate: false,
    earliestJoiningDate: '',
    yearsPmExperience: '',
    totalYearsExperience: '',
    portfolioUrl: '',
    highestEducation: '',
    linkedinHeadlineSummary: ''
  });
  if (!res.ok) {
    setStatus('Profile saved locally. Backend sync partial.', 'warn');
    setDebug(`profile_sync=${res.status} err=${res?.data?.error?.message || res.error || ''}`);
    return;
  }
  setStatus('Saved. Smart Apply and Smart Email are enabled.', 'ok');
});

reloadTabBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;
    chrome.tabs.reload(tab.id);
  });
});

reloadExtBtn.addEventListener('click', () => chrome.runtime.reload());

loadExisting();
