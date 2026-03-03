(function initOpenJobsCore(root, factory) {
  const api = factory();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  root.OpenJobsCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function makeOpenJobsCore() {
  function normalize(value) {
    return String(value || '').toLowerCase().trim();
  }

  function makeDescriptor(parts) {
    return normalize(parts.filter(Boolean).join(' '));
  }

  function detectFieldKey(descriptor, patterns) {
    const normalizedDescriptor = normalize(descriptor);

    for (const [key, regexList] of Object.entries(patterns)) {
      if (regexList.some((regex) => regex.test(normalizedDescriptor))) {
        return key;
      }
    }

    return null;
  }

  function actionIntent(text) {
    const t = normalize(text);

    if (!t) return 'unknown';
    if (t.includes('submit') || t.includes('send application') || t === 'apply') return 'submit';
    if (t.includes('review')) return 'review';
    if (t.includes('next') || t.includes('continue')) return 'next';
    if (t.includes('done') || t.includes('close')) return 'done';

    return 'unknown';
  }

  function isLikelyQuestionText(text) {
    const t = String(text || '').trim();
    if (t.length < 8) return false;
    if (t.length > 400) return false;
    if (/^(first|last|full)\s*name$/i.test(t)) return false;
    if (/^e-?mail$/i.test(t)) return false;
    if (/^phone$/i.test(t)) return false;
    return true;
  }

  function hasValidationErrorText(text) {
    const t = normalize(text);
    return (
      t.includes('required') ||
      t.includes('enter a valid') ||
      t.includes('please enter') ||
      t.includes('cannot be blank') ||
      t.includes('must be')
    );
  }

  return {
    normalize,
    makeDescriptor,
    detectFieldKey,
    actionIntent,
    isLikelyQuestionText,
    hasValidationErrorText
  };
});
