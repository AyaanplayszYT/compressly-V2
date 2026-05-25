/* ── About page ──────────────────────────────────────────────── */
window.AboutPage = (() => {
  window.api.getVersion().then(v => {
    const el = document.getElementById('about-version');
    if (el) el.textContent = `v${v} · Electron`;
  });

  const githubBtn = document.getElementById('about-github-btn');
  if (githubBtn) {
    githubBtn.addEventListener('click', () => {
      window.api.openExternal('https://github.com/AyaanplayszYT/Compressly');
    });
  }
})();
