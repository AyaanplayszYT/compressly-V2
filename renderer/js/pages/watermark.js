/* ── Watermark page ───────────────────────────────────────────── */
window.WatermarkPage = (() => {
  const dropzone   = document.getElementById('wm-dropzone');
  const queueEl    = document.getElementById('wm-queue');
  const runBtn     = document.getElementById('wm-run-btn');
  const textEl     = document.getElementById('wm-text');
  const posEl      = document.getElementById('wm-position');
  const opacityEl  = document.getElementById('wm-opacity');
  const opacityVal = document.getElementById('wm-opacity-val');

  let _files = [];
  opacityEl.addEventListener('input', () => { opacityVal.textContent = opacityEl.value; });

  Utils.makeDropzone(dropzone, paths => {
    paths.forEach(p => { if (!_files.find(f => f.path === p)) _files.push({ path: p }); });
    renderQueue();
  });

  runBtn.addEventListener('click', async () => {
    if (!_files.length) { Toast.show('Add images first', 'info'); return; }
    runBtn.disabled = true; runBtn.textContent = 'Applying…';
    _files.forEach((_,i) => Utils.updateQueueRow(i,'Running'));
    const results = await window.api.watermarkBatch(_files.map(f=>f.path), {
      text: textEl.value || 'Compressly',
      position: posEl.value,
      opacity: parseInt(opacityEl.value) / 100,
    });
    results.forEach((r,i) => {
      if (r.success) Utils.updateQueueRow(i,'Done');
      else Utils.updateQueueRow(i,'Error',r.error);
    });
    Toast.show(`Watermarked ${results.filter(r=>r.success).length} files`, 'success');
    runBtn.disabled = false; runBtn.textContent = 'Apply to All';
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
