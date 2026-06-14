(function () {
  const GA_MEASUREMENT_ID = 'G-88EE6TX60M';
  const CONSENT_STORAGE_KEY = 'swm_ga4_consent';
  const PRODUCT_NAME = 'book';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const ALLOWED_EVENTS = new Set([
    'page_view',
    'calculator_started',
    'calculator_completed',
    'result_viewed',
    'checkout_clicked',
    'email_contact_clicked',
    'purchase_completed',
  ]);
  const CHECKOUT_LOCATIONS = new Set(['hero', 'calculator_result', 'book_section', 'footer', 'sticky_cta']);

  let googleTagConfigured = false;
  let googleTagLoading = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  window.gtag('js', new Date());

  function isConfiguredMeasurementId(id) {
    return /^G-[A-Z0-9]+$/.test(id);
  }

  function readStoredConsent() {
    try {
      return window.localStorage.getItem(CONSENT_STORAGE_KEY);
    } catch (_error) {
      return null;
    }
  }

  function storeConsent(value) {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch (_error) {
      // If storage is unavailable, respect the choice for the current page view only.
    }
  }

  function hasAnalyticsConsent() {
    return readStoredConsent() === 'granted';
  }

  function loadGoogleTag() {
    if (googleTagLoading || document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"]`)) {
      googleTagLoading = true;
      return;
    }

    if (!isConfiguredMeasurementId(GA_MEASUREMENT_ID)) {
      console.warn('GA4 measurement ID is not configured correctly in analytics.js.');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
    document.head.appendChild(script);
    googleTagLoading = true;
  }

  function configureGoogleTag() {
    if (googleTagConfigured || !hasAnalyticsConsent()) return;

    loadGoogleTag();
    window.gtag('config', GA_MEASUREMENT_ID);
    googleTagConfigured = true;
  }

  function updateConsent(value) {
    const granted = value === 'granted';

    storeConsent(granted ? 'granted' : 'denied');
    window.gtag('consent', 'update', {
      analytics_storage: granted ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });

    if (granted) configureGoogleTag();
  }

  function trackEvent(eventName, parameters = {}) {
    if (!ALLOWED_EVENTS.has(eventName) || !hasAnalyticsConsent()) return;
    configureGoogleTag();
    window.gtag('event', eventName, parameters);
  }

  function getCurrentUtmParams() {
    const currentParams = new URLSearchParams(window.location.search);
    const utmParams = new URLSearchParams();

    UTM_KEYS.forEach((key) => {
      const value = currentParams.get(key);
      if (value) utmParams.set(key, value);
    });

    return utmParams;
  }

  function preserveUtmParamsOnInternalLinks() {
    const utmParams = getCurrentUtmParams();
    if ([...utmParams].length === 0) return;

    document.querySelectorAll('a[href]').forEach((link) => {
      const rawHref = link.getAttribute('href');
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:') ||
        rawHref.startsWith('javascript:')
      ) {
        return;
      }

      let url;
      try {
        url = new URL(rawHref, window.location.href);
      } catch (_error) {
        return;
      }

      if (url.origin !== window.location.origin) return;

      UTM_KEYS.forEach((key) => {
        if (!url.searchParams.has(key) && utmParams.has(key)) {
          url.searchParams.set(key, utmParams.get(key));
        }
      });

      link.href = url.pathname + url.search + url.hash;
    });
  }

  function isCheckoutLink(link) {
    const href = link.getAttribute('href') || '';
    const analyticsEvent = link.dataset.analyticsEvent;

    return (
      analyticsEvent === 'checkout_clicked' ||
      /lemonsqueezy\.com|lemon\.squeezy|lemon-squeezy/i.test(href)
    );
  }

  function normalizeCheckoutLocation(location) {
    return CHECKOUT_LOCATIONS.has(location) ? location : 'book_section';
  }

  function getCheckoutLocation(link) {
    if (link.dataset.analyticsLocation) return normalizeCheckoutLocation(link.dataset.analyticsLocation);
    if (link.closest('.panel-results')) return 'calculator_result';
    if (link.closest('.hero')) return 'hero';
    if (link.closest('footer')) return 'footer';
    if (link.closest('#purchase')) return 'book_section';
    return 'book_section';
  }

  function getPrivacyHref() {
    return window.location.pathname.includes('/calculator/') ? '../datenschutz.html' : 'datenschutz.html';
  }

  function ensureConsentStyles() {
    if (document.getElementById('swm-consent-styles')) return;

    const style = document.createElement('style');
    style.id = 'swm-consent-styles';
    style.textContent = `
      .swm-consent-banner {
        position: fixed;
        left: 50%;
        bottom: 18px;
        z-index: 1000;
        width: min(720px, calc(100% - 28px));
        transform: translateX(-50%);
        background: #F8F3EC;
        color: #2A2018;
        border: 1px solid #DDD3C4;
        border-radius: 8px;
        box-shadow: 0 18px 50px rgba(26, 43, 64, 0.22);
        padding: 1rem;
        font-family: Jost, system-ui, sans-serif;
      }
      .swm-consent-banner[hidden] { display: none; }
      .swm-consent-text {
        margin: 0;
        font-size: 0.9rem;
        line-height: 1.55;
      }
      .swm-consent-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.7rem;
        margin-top: 0.9rem;
      }
      .swm-consent-button {
        border: 1px solid #1A2B40;
        border-radius: 4px;
        cursor: pointer;
        font: inherit;
        padding: 0.65rem 1rem;
      }
      .swm-consent-button.is-primary {
        background: #1A2B40;
        color: #F8F3EC;
      }
      .swm-consent-button.is-secondary {
        background: transparent;
        color: #1A2B40;
      }
      .swm-consent-link {
        color: #5A4E42;
        font-size: 0.82rem;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      @media (max-width: 520px) {
        .swm-consent-actions { align-items: stretch; flex-direction: column; }
        .swm-consent-button, .swm-consent-link { width: 100%; text-align: center; }
      }
    `;
    document.head.appendChild(style);
  }

  function getOrCreateConsentBanner() {
    let banner = document.getElementById('swm-consent-banner');
    if (banner) return banner;

    ensureConsentStyles();

    banner = document.createElement('aside');
    banner.id = 'swm-consent-banner';
    banner.className = 'swm-consent-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('aria-label', 'Cookie-Einstellungen');
    banner.hidden = true;
    banner.innerHTML = `
      <p class="swm-consent-text">Wir nutzen Google Analytics, um zu verstehen, wie diese Webseite genutzt wird. Dabei messen wir Seitenaufrufe, Calculator-Nutzung und Klicks auf den Checkout. Es werden keine Calculator-Eingaben oder persoenlichen Inhalte erfasst.</p>
      <div class="swm-consent-actions">
        <button class="swm-consent-button is-primary" type="button" data-consent-choice="granted">Akzeptieren</button>
        <button class="swm-consent-button is-secondary" type="button" data-consent-choice="denied">Ablehnen</button>
        <a class="swm-consent-link" href="${getPrivacyHref()}">Datenschutzerklaerung</a>
      </div>
    `;

    banner.addEventListener('click', (event) => {
      const button = event.target.closest('[data-consent-choice]');
      if (!button) return;

      updateConsent(button.dataset.consentChoice);
      if (button.dataset.consentChoice === 'granted') trackThankYouPage();
      banner.hidden = true;
    });

    document.body.appendChild(banner);
    return banner;
  }

  function showConsentBanner() {
    getOrCreateConsentBanner().hidden = false;
  }

  function attachCookieSettingsLinks() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-cookie-settings]');
      if (!link) return;

      event.preventDefault();
      showConsentBanner();
    });
  }

  function attachClickTracking() {
    document.addEventListener('click', (event) => {
      const link = event.target.closest('a[href]');
      if (!link) return;

      const href = link.getAttribute('href') || '';

      if (href.startsWith('mailto:')) {
        trackEvent('email_contact_clicked', {
          location: link.closest('footer') ? 'footer' : 'page',
        });
      }

      if (isCheckoutLink(link)) {
        trackEvent('checkout_clicked', {
          location: getCheckoutLocation(link),
          product: link.dataset.analyticsProduct || PRODUCT_NAME,
        });
      }
    });
  }

  function trackThankYouPage() {
    if (!/\/thank-you(?:\.html)?\/?$/.test(window.location.pathname)) return;

    trackEvent('purchase_completed', {
      product: PRODUCT_NAME,
    });
  }

  function applyStoredConsent() {
    const storedConsent = readStoredConsent();

    if (storedConsent === 'granted') {
      updateConsent('granted');
      return;
    }

    if (storedConsent === 'denied') {
      updateConsent('denied');
      return;
    }

    showConsentBanner();
  }

  window.swmTrackEvent = trackEvent;
  window.swmOpenCookieSettings = showConsentBanner;

  document.addEventListener('DOMContentLoaded', () => {
    preserveUtmParamsOnInternalLinks();
    attachCookieSettingsLinks();
    attachClickTracking();
    applyStoredConsent();
    trackThankYouPage();
  });
})();
