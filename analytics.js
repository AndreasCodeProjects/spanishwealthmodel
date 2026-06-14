(function () {
  const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX';
  const PLACEHOLDER_ID = 'G-XXXXXXXXXX';
  const PRODUCT_NAME = 'book';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const trackedFaqItems = new WeakSet();

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());

  function isConfiguredMeasurementId(id) {
    return /^G-[A-Z0-9]+$/.test(id) && id !== PLACEHOLDER_ID;
  }

  function loadGoogleTag(id) {
    if (!isConfiguredMeasurementId(id)) {
      console.warn('GA4 measurement ID is not configured. Replace G-XXXXXXXXXX in analytics.js.');
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);

    window.gtag('config', id);
  }

  function trackEvent(eventName, parameters = {}) {
    if (!eventName) return;
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

  function getCheckoutLocation(link) {
    if (link.dataset.analyticsLocation) return link.dataset.analyticsLocation;
    if (link.closest('#purchase')) return 'book_section';
    if (link.closest('.hero')) return 'hero';
    if (link.closest('.panel-results')) return 'calculator_result';
    if (link.closest('footer')) return 'footer';
    return 'unknown';
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

      if (/sample|leseprobe|chapter/i.test(href) || link.dataset.analyticsEvent === 'sample_chapter_clicked') {
        trackEvent('sample_chapter_clicked', {
          location: link.dataset.analyticsLocation || 'page',
          product: link.dataset.analyticsProduct || PRODUCT_NAME,
        });
      }

      if (isCheckoutLink(link)) {
        trackEvent('checkout_clicked', {
          location: getCheckoutLocation(link),
          product: link.dataset.analyticsProduct || PRODUCT_NAME,
        });
      }
    });

    document.querySelectorAll('.faq-item').forEach((item, index) => {
      item.addEventListener('click', () => {
        if (trackedFaqItems.has(item)) return;
        trackedFaqItems.add(item);

        trackEvent('faq_opened', {
          faq_index: index + 1,
        });
      });
    });
  }

  function trackBookSectionView() {
    const purchaseSection = document.getElementById('purchase');
    if (!purchaseSection || !('IntersectionObserver' in window)) return;

    let hasTracked = false;
    const observer = new IntersectionObserver((entries) => {
      if (hasTracked) return;

      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        hasTracked = true;
        trackEvent('book_section_viewed', {
          section: 'purchase',
          product: PRODUCT_NAME,
        });
        observer.disconnect();
      });
    }, { threshold: 0.35 });

    observer.observe(purchaseSection);
  }

  function trackThankYouPage() {
    if (!/\/thank-you(?:\.html)?\/?$/.test(window.location.pathname)) return;

    trackEvent('purchase_completed', {
      product: PRODUCT_NAME,
    });
  }

  window.swmTrackEvent = trackEvent;

  loadGoogleTag(GA_MEASUREMENT_ID);

  document.addEventListener('DOMContentLoaded', () => {
    preserveUtmParamsOnInternalLinks();
    attachClickTracking();
    trackBookSectionView();
    trackThankYouPage();
  });
})();
