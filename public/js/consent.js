(function () {
  const options = window.fcConsentOptions || {};
  const key = options.key || 'fc_cookie_consent';
  const version = options.version || 2;
  const maxAgeMs = options.maxAgeMs || 1000 * 60 * 60 * 24 * 180;
  const clarityProjectId = options.clarityProjectId || 'wyvpd9qsgv';
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

  function readStoredChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      if (!value || typeof value.status !== 'string' || !value.updatedAt) return null;

      if (value.version !== version || Date.now() - value.updatedAt > maxAgeMs) {
        localStorage.removeItem(key);
        return null;
      }

      return value.status;
    } catch (error) {
      return null;
    }
  }

  function readChoice() {
    const storedChoice = readStoredChoice();
    if (storedChoice) return storedChoice;

    if (typeof window.fcReadCookieConsent === 'function') {
      return window.fcReadCookieConsent();
    }

    return null;
  }

  function ensureClarityQueue() {
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    return window.clarity;
  }

  function updateClarityConsent(status) {
    if (!clarityProjectId || typeof window.clarity !== 'function') return;

    window.clarity('consentv2', {
      ad_Storage: status,
      analytics_Storage: status,
    });
  }

  function loadClarity() {
    if (!clarityProjectId) return;

    const clarity = ensureClarityQueue();
    clarity('consentv2', {
      ad_Storage: 'granted',
      analytics_Storage: 'granted',
    });

    if (document.getElementById('microsoft-clarity-script')) return;

    const script = document.createElement('script');
    script.id = 'microsoft-clarity-script';
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${clarityProjectId}`;

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);
  }

  function applyConsent(status) {
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', status === 'accepted' ? granted : denied);
    }

    if (status === 'accepted') {
      loadClarity();
    } else {
      updateClarityConsent('denied');
    }
  }

  function saveChoice(status) {
    try {
      localStorage.setItem(key, JSON.stringify({
        status,
        updatedAt: Date.now(),
        version,
      }));
    } catch (error) {}

    applyConsent(status);

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
        <p>We use optional Google and Microsoft cookies to measure visits, improve ads, understand page behaviour, and track quote enquiries. You can accept or reject optional cookies.</p>
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

  const currentChoice = readChoice();
  if (currentChoice === 'accepted') {
    loadClarity();
  }

  if (!currentChoice) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner, { once: true });
    } else {
      showBanner();
    }
  }
})();
