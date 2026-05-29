(() => {
  const forms = document.querySelectorAll('form[name="contact"]');
  if (!forms.length) return;

  const attributionFields = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'gclid',
  ];

  const params = new URLSearchParams(window.location.search);

  function readStoredValue(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function writeStoredValue(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch (error) {
      // Keep lead forms working when storage is blocked.
    }
  }

  const attributionValues = {};
  attributionFields.forEach((name) => {
    const storageKey = `fc_${name}`;
    const queryValue = params.get(name);
    const value = queryValue || readStoredValue(storageKey);
    if (queryValue) writeStoredValue(storageKey, queryValue);
    attributionValues[name] = value;
  });

  const referrerValue = document.referrer || readStoredValue('fc_referrer');
  if (document.referrer) writeStoredValue('fc_referrer', document.referrer);

  forms.forEach((form) => {
    attributionFields.forEach((name) => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) input.value = attributionValues[name];
    });

    const pageUrl = form.querySelector('[name="page_url"]');
    const referrer = form.querySelector('[name="referrer"]');
    if (pageUrl) pageUrl.value = window.location.href;
    if (referrer) referrer.value = referrerValue;

    form.addEventListener('submit', () => {
      const email = form.querySelector('input[name="email"]')?.value.trim().toLowerCase();
      if (!email || !window.fcHasMarketingConsent?.()) return;

      const userData = { email };
      window.fcEnhancedConversionEmail = email;
      window.fcEnhancedConversionUserData = userData;
      if (typeof gtag === 'function') gtag('set', 'user_data', userData);
      try {
        sessionStorage.setItem('fc_enhanced_conversion_user_data', JSON.stringify(userData));
      } catch (error) {
        // Keep the form submission working even if session storage is unavailable.
      }
    });
  });
})();
