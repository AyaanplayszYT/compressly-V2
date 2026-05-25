/* ── Naming page ─────────────────────────────────────────────── */
window.NamingPage = (() => {
  const templateEl = document.getElementById('naming-template');
  const previewEl  = document.getElementById('naming-preview');
  const saveBtn    = document.getElementById('naming-save-btn');

  // Load saved template
  window.api.settingGet('namingTemplate', '{name}_compressed').then(t => {
    templateEl.value = t;
    updatePreview(t);
  });

  templateEl.addEventListener('input', () => updatePreview(templateEl.value));

  saveBtn.addEventListener('click', async () => {
    await window.api.settingSet('namingTemplate', templateEl.value);
    Toast.show('Naming template saved', 'success');
  });

  function updatePreview(tpl) {
    const now = new Date();
    const sample = tpl
      .replace(/{name}/g,    'photo')
      .replace(/{date}/g,    now.toISOString().slice(0,10))
      .replace(/{width}/g,   '1920')
      .replace(/{height}/g,  '1080')
      .replace(/{format}/g,  'webp')
      .replace(/{quality}/g, '82');
    previewEl.textContent = sample + '.webp';
  }
})();
