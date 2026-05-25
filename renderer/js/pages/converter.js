/* ── Converter page ───────────────────────────────────────────── */
window.ConverterPage = (() => {
  const dropzone  = document.getElementById('conv-dropzone');
  const queueEl   = document.getElementById('conv-queue');
  const runBtn    = document.getElementById('conv-run-btn');
  const formatSel = document.getElementById('conv-format');
  const qualityEl = document.getElementById('conv-quality');
  const outdirEl  = document.getElementById('conv-outdir');
  const outdirBtn = document.getElementById('conv-outdir-btn');

  let _files = [];
  let _outputDir = null;

  Utils.makeDropzone(dropzone, addFiles);

  outdirBtn.addEventListener('click', async () => {
    const dir = await window.api.openFolder();
    if (dir) { _outputDir = dir; outdirEl.value = dir; }
  });

  runBtn.addEventListener('click', async () => {
    if (!_files.length) { Toast.show('Add images first', 'info'); return; }
    runBtn.disabled = true; runBtn.textContent = 'Converting…';
    _files.forEach((_, i) => Utils.updateQueueRow(i, 'Running'));
    const results = await window.api.convertBatch(_files.map(f => f.path), {
      format: formatSel.value,
      quality: parseInt(qualityEl.value),
      outputDir: _outputDir || null,
    });
    results.forEach((r, i) => {
      if (r.success) Utils.updateQueueRow(i, 'Done', `→ ${Utils.fmtBytes(r.outputSize)}`);
      else Utils.updateQueueRow(i, 'Error', r.error);
    });
    const ok = results.filter(r => r.success).length;
    Toast.show(`Converted ${ok}/${results.length} files`, ok === results.length ? 'success' : 'info');
    runBtn.disabled = false; runBtn.textContent = 'Convert All';
  });

  function addFiles(paths) {
    paths.forEach(p => { if (!_files.find(f => f.path === p)) _files.push({ path: p }); });
    renderQueue();
  }

  function renderQueue() {
    queueEl.innerHTML = '';
    _files.forEach((f, i) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML = `
        <span class="queue-row-name">${Utils.basename(f.path)}</span>
        <span class="queue-row-status" id="qstat-${i}">Queued</span>
        <div class="queue-row-action">
          <button class="btn btn-icon btn-ghost" data-i="${i}">&#x2715;</button>
        </div>`;
      row.querySelector('button').addEventListener('click', () => { _files.splice(i,1); renderQueue(); });
      queueEl.appendChild(row);
    });
  }
})();
