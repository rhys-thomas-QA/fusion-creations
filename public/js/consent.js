(function () {
  const options = window.fcConsentOptions || {};
  const key = options.key || 'fc_cookie_consent';
  const denied = options.denied || {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  };
  const granted = options.granted || {
    ad_storage: 'granted',
    analytics_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  };

  function readChoice() {
    if (typeof window.fcReadCookieConsent === 'function') {
      return window.fcReadCookieConsent();
    }

    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value && typeof value.status === 'string' ? value.status : null;
    } catch (error) {
      return null;
    }
  }

  function saveChoice(status) {
    try {
      localStorage.setItem(key, JSON.stringify({
        status,
        updatedAt: Date.now(),
        version: 1,
      }));
    } catch (error) {}

    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', status === 'accepted' ? granted : denied);
    }

    const banner = document.getElementById('cookie-consent');
    if (banner) banner.hidden = true;
  }

  function createBanner() {
    const banner = document.createElement('section');
    banner.id = 'cookie-consent';
    banner.className = 'cookie-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-labelledby', 'cookie-consent-title');
    banner.hidden = true;
    banner.innerHTML = `
      <div class="cookie-consent__copy">
        <h2 id="cookie-consent-title">Cookies &amp; privacy</h2>
        <p>We use optional Google cookies to measure visits, improve ads, and track quote enquiries. You can accept or reject optional cookies.</p>
        <a href="/privacy.html">Privacy &amp; cookies</a>
      </div>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__secondary" data-cookie-choice="rejected">Reject optional</button>
        <button type="button" class="cookie-consent__primary" data-cookie-choice="accepted">Accept optional</button>
      </div>
    `;
    document.body.appendChild(banner);
    return banner;
  }

  function showBanner() {
    const banner = document.getElementById('cookie-consent') || createBanner();
    banner.hidden = false;
  }

  document.addEventListener('click', (event) => {
    const choiceButton = event.target.closest('[data-cookie-choice]');
    if (choiceButton) {
      saveChoice(choiceButton.dataset.cookieChoice);
      return;
    }

    const settingsButton = event.target.closest('[data-cookie-settings]');
    if (settingsButton) {
      event.preventDefault();
      showBanner();
    }
  });

  if (!readChoice()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner, { once: true });
    } else {
      showBanner();
    }
  }
})();
