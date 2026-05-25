/* ── Settings page ───────────────────────────────────────────── */
window.SettingsPage = (() => {
  const formatSel    = document.getElementById('settings-format');
  const qualityEl    = document.getElementById('settings-quality');
  const qualValEl    = document.getElementById('settings-quality-val');
  const outdirEl     = document.getElementById('settings-outdir');
  const outdirBtn    = document.getElementById('settings-outdir-btn');
  const keepMetaEl   = document.getElementById('settings-keep-meta');
  const saveBtn      = document.getElementById('settings-save-btn');
  const darkBtn      = document.getElementById('theme-dark-btn');
  const lightBtn     = document.getElementById('theme-light-btn');

  qualityEl.addEventListener('input', () => { qualValEl.textContent = qualityEl.value; });

  outdirBtn.addEventListener('click', async () => {
    const dir = await window.api.openFolder();
    if (dir) { outdirEl.value = dir; }
  });

  darkBtn.addEventListener('click',  () => App.setTheme('dark'));
  lightBtn.addEventListener('click', () => App.setTheme('light'));

  saveBtn.addEventListener('click', async () => {
    await window.api.settingSet('defaultFormat',  formatSel.value);
    await window.api.settingSet('defaultQuality', parseInt(qualityEl.value));
    await window.api.settingSet('defaultOutputDir', outdirEl.value);
    await window.api.settingSet('keepMetadata', keepMetaEl.checked);
    Toast.show('Settings saved', 'success');
  });

  // Load settings
  window.api.settingsGetAll().then(s => {
    if (s.defaultFormat)  formatSel.value = s.defaultFormat;
    if (s.defaultQuality) { qualityEl.value = s.defaultQuality; qualValEl.textContent = s.defaultQuality; }
    if (s.defaultOutputDir) outdirEl.value = s.defaultOutputDir;
    if (s.keepMetadata !== undefined) keepMetaEl.checked = s.keepMetadata;
  });
})();
