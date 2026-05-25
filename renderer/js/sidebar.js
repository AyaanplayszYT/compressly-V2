/* ── Sidebar ──────────────────────────────────────────────────── */

window.Sidebar = (() => {
  const sidebar       = document.getElementById('sidebar');
  const collapseBtn   = document.getElementById('sidebar-collapse');
  const navItems      = document.querySelectorAll('.nav-item');
  const logoTextDark  = document.getElementById('logo-text-dark');
  const logoTextLight = document.getElementById('logo-text-light');

  let _expanded = false;
  let _onNav    = null;

  // Restore from localStorage
  _expanded = localStorage.getItem('sidebar_expanded') === 'true';
  _applyExpanded(false);

  collapseBtn.addEventListener('click', toggle);

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      select(page);
      if (_onNav) _onNav(page);
    });
  });

  function toggle() {
    _expanded = !_expanded;
    localStorage.setItem('sidebar_expanded', _expanded);
    _applyExpanded(true);
  }

  function _applyExpanded(animate) {
    if (_expanded) {
      sidebar.classList.add('expanded');
    } else {
      sidebar.classList.remove('expanded');
    }
    collapseBtn.textContent = _expanded ? '‹' : '›';
    collapseBtn.title = _expanded ? 'Collapse sidebar' : 'Expand sidebar';
  }

  function select(pageKey) {
    navItems.forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageKey);
    });
  }

  function setTheme(theme) {
    if (theme === 'light') {
      logoTextDark.style.display  = 'none';
      logoTextLight.style.display = 'block';
    } else {
      logoTextDark.style.display  = 'block';
      logoTextLight.style.display = 'none';
    }
  }

  function onNav(cb) { _onNav = cb; }

  // Allow external toggle (titlebar button)
  document.getElementById('sidebar-toggle-btn').addEventListener('click', toggle);

  return { toggle, select, setTheme, onNav };
})();
