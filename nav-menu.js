(function () {
  function closeMenu(container, button) {
    container.classList.remove('is-open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', button.dataset.closedLabel || 'Menü öffnen');
  }

  function openMenu(container, button) {
    container.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', button.dataset.openLabel || 'Menü schließen');
  }

  function initNavigation(container) {
    const button = container.querySelector('.nav-toggle');
    const menu = container.querySelector('.nav-links, .site-nav');
    if (!button || !menu) return;

    button.dataset.closedLabel = button.getAttribute('aria-label') || 'Menü öffnen';
    button.dataset.openLabel = button.dataset.closedLabel.includes('Open') ? 'Close menu' : 'Menü schließen';

    button.addEventListener('click', () => {
      if (container.classList.contains('is-open')) {
        closeMenu(container, button);
      } else {
        openMenu(container, button);
      }
    });

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) closeMenu(container, button);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu(container, button);
    });

    window.addEventListener('resize', () => {
      if (window.matchMedia('(min-width: 681px)').matches) closeMenu(container, button);
    });
  }

  function initMenus() {
    document.querySelectorAll('body > nav, .site-header').forEach(initNavigation);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenus, { once: true });
  } else {
    initMenus();
  }
})();
