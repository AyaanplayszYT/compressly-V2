/* ── Resizer page ─────────────────────────────────────────────── */
window.ResizerPage = (() => {
  const dropzone  = document.getElementById('resize-dropzone');
  const queueEl   = document.getElementById('resize-queue');
  const runBtn    = document.getElementById('resize-run-btn');
  const widthEl   = document.getElementById('resize-width');
  const heightEl  = document.getElementById('resize-height');
  const aspectEl  = document.getElementById('resize-aspect');
  const outdirEl  = document.getElementById('resize-outdir');
  const outdirBtn = document.getElementById('resize-outdir-btn');

  let _files = []; let _outputDir = null;

  Utils.makeDropzone(dropzone, paths => {
    paths.forEach(p => { if (!_files.find(f => f.path === p)) _files.push({ path: p }); });
    renderQueue();
  });

  outdirBtn.addEventListener('click', async () => {
    const dir = await window.api.openFolder();
    if (dir) { _outputDir = dir; outdirEl.value = dir; }
  });

  runBtn.addEventListener('click', async () => {
    if (!_files.length) { Toast.show('Add images first', 'info'); return; }
    const w = parseInt(widthEl.value) || 0;
    const h = parseInt(heightEl.value) || 0;
    if (!w && !h) { Toast.show('Enter width or height', 'info'); return; }
    runBtn.disabled = true; runBtn.textContent = 'Resizing…';
    _files.forEach((_,i) => Utils.updateQueueRow(i,'Running'));
    const results = await window.api.resizeBatch(_files.map(f=>f.path), {
      width: w || undefined, height: h || undefined,
      keepAspect: aspectEl.checked, outputDir: _outputDir,
    });
    results.forEach((r,i) => {
      if (r.success) Utils.updateQueueRow(i,'Done',`→ ${Utils.fmtBytes(r.outputSize)}`);
      else Utils.updateQueueRow(i,'Error',r.error);
    });
    Toast.show(`Resized ${results.filter(r=>r.success).length}/${results.length}`, 'success');
    runBtn.disabled = false; runBtn.textContent = 'Resize All';
  });

  function renderQueue() {
    queueEl.innerHTML = '';
    _files.forEach((f,i) => {
      const row = document.createElement('div');
      row.className = 'queue-row';
      row.innerHTML = `<span class="queue-row-name">${Utils.basename(f.path)}</span><span class="queue-row-status" id="qstat-${i}">Queued</span><div class="queue-row-action"><button class="btn btn-icon btn-ghost">&#x2715;</button></div>`;
      row.querySelector('button').addEventListener('click',()=>{_files.splice(i,1);renderQueue();});
      queueEl.appendChild(row);
    });
  }
})();
