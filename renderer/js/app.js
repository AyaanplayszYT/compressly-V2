/* ── App — router, theme, init ───────────────────────────────── */

window.App = (() => {
  const pages  = document.querySelectorAll('.page');
  let _current = 'dashboard';

  // ── Router ────────────────────────────────────────────────── //
  function navigate(pageKey) {
    if (pageKey === _current) return;
    _current = pageKey;

    pages.forEach(p => {
      p.classList.toggle('active', p.id === `page-${pageKey}`);
    });

    Sidebar.select(pageKey);

    // Notify page JS via custom event
    document.dispatchEvent(new CustomEvent('pageChange', { detail: pageKey }));
  }

  Sidebar.onNav(navigate);

  // Keyboard shortcut: Ctrl+\ toggles sidebar
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === '\\') Sidebar.toggle();
    // Escape closes any open modal
    if (e.key === 'Escape') { /* reserved */ }
  });

  // ── Theme ──────────────────────────────────────────────────── //
  function setTheme(theme) {
    document.body.classList.toggle('theme-dark',  theme === 'dark');
    document.body.classList.toggle('theme-light', theme === 'light');
    Sidebar.setTheme(theme);
    window.api.settingSet('theme', theme);
  }

  // Load saved theme
  window.api.settingGet('theme', 'dark').then(t => setTheme(t));

  // ── Expose for pages ───────────────────────────────────────── //
  return { navigate, setTheme };
})();
