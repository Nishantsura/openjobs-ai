chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenJobs AI extension installed');
});

function candidateUrls(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (!isLocalHost) return [url];

    const hosts = ['localhost', '127.0.0.1'];
    // Always probe common local dev ports to avoid silent failures when Next.js auto-bumps ports.
    const ports = ['3000', '3001', '3002', port];
    const out = [];

    for (const h of hosts) {
      for (const p of ports) {
        const next = new URL(url);
        next.hostname = h;
        next.port = p;
        out.push(next.toString());
      }
    }

    return [...new Set(out)];
  } catch (_err) {
    return [url];
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'OPENJOBS_API_REQUEST') return false;

  const { url, method, headers, body } = message.payload || {};
  if (!url || !method) {
    sendResponse({ ok: false, status: 400, error: 'Invalid API request payload' });
    return true;
  }

  (async () => {
    const urls = candidateUrls(url);
    let lastError = 'Request failed';

    for (const targetUrl of urls) {
      try {
        const response = await fetch(targetUrl, {
          method,
          headers: headers || {},
          body: body ? JSON.stringify(body) : undefined
        });

        let data = null;
        try {
          data = await response.json();
        } catch (_error) {
          data = null;
        }

        sendResponse({
          ok: response.ok,
          status: response.status,
          data,
          resolvedUrl: targetUrl
        });
        return;
      } catch (error) {
        lastError = error instanceof Error ? error.message : 'Request failed';
      }
    }

    sendResponse({
      ok: false,
      status: 500,
      error: lastError
    });
  })();

  return true;
});
