(() => {
  const eventNames = {
    ctaClick: 'fc_quote_cta_clicked',
    formStart: 'fc_quote_form_started',
    pricingView: 'fc_pricing_viewed',
    proofView: 'fc_proof_viewed',
    quoteView: 'fc_quote_form_viewed',
  };

  const sentEvents = new Set();

  function hasMarketingConsent() {
    if (typeof window.fcHasMarketingConsent !== 'function') return false;
    return window.fcHasMarketingConsent();
  }

  function track(eventName, properties = {}, onceKey = '') {
    if (!hasMarketingConsent()) return;

    const dedupeKey = onceKey || eventName;
    if (onceKey && sentEvents.has(dedupeKey)) return;
    if (onceKey) sentEvents.add(dedupeKey);

    const payload = {
      page_path: window.location.pathname,
      page_title: document.title,
      ...properties,
    };

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, payload);
    }

    if (typeof window.clarity === 'function') {
      window.clarity('event', eventName);
    }
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href], button[data-track-cta]');
    if (!link) return;

    const href = link.getAttribute('href') || '';
    const isQuoteLink = href === '#quote' || href.endsWith('/#quote') || href.endsWith('/custom-id-card-holders/#quote');
    const ctaName = link.dataset.trackCta;

    if (!isQuoteLink && ctaName !== 'quote') return;

    track(eventNames.ctaClick, {
      cta_text: link.textContent.replace(/\s+/g, ' ').trim().slice(0, 80),
      cta_location: link.dataset.trackLocation || 'unknown',
      target_url: href,
    });
  });

  document.querySelectorAll('form[name="contact"]').forEach((form) => {
    const startHandler = () => {
      track(eventNames.formStart, {
        form_name: form.getAttribute('name') || 'contact',
      }, 'quote-form-started');
    };

    form.addEventListener('focusin', startHandler, { once: true });
    form.addEventListener('change', startHandler, { once: true });
  });

  const sections = document.querySelectorAll('[data-track-view]');
  if (!sections.length || !('IntersectionObserver' in window)) return;

  const sectionEvents = {
    pricing: eventNames.pricingView,
    proof: eventNames.proofView,
    quote_form: eventNames.quoteView,
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const section = entry.target.dataset.trackView;
      const eventName = sectionEvents[section];
      if (!eventName) return;

      track(eventName, {
        section,
      }, `view-${section}`);
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -20% 0px',
    threshold: 0.35,
  });

  sections.forEach((section) => observer.observe(section));
})();
