/* ── GIF page ─────────────────────────────────────────────────── */
window.GifPage = (() => {
  const dropzone = document.getElementById('gif-dropzone');
  const queueEl  = document.getElementById('gif-queue');
  const runBtn   = document.getElementById('gif-run-btn');
  let _files = [];

  Utils.makeDropzone(dropzone, paths => {
    paths.forEach(p => { if (!_files.find(f => f.path === p)) _files.push({ path: p }); });
    renderQueue();
  }, ['gif']);

  runBtn.addEventListener('click', async () => {
    if (!_files.length) { Toast.show('Add GIF files first', 'info'); return; }
    runBtn.disabled = true; runBtn.textContent = 'Optimising…';
    _files.forEach((_,i) => Utils.updateQueueRow(i,'Running'));
    // Compress GIFs using WebP conversion (sharp converts animated GIF to WebP)
    const results = await window.api.convertBatch(_files.map(f => f.path), { format: 'webp', quality: 75 });
    results.forEach((r,i) => {
      if (r.success) Utils.updateQueueRow(i,'Done', `→ ${Utils.fmtBytes(r.outputSize)}`);
      else Utils.updateQueueRow(i,'Error',r.error);
    });
    Toast.show(`Optimised ${results.filter(r=>r.success).length} GIFs`, 'success');
    runBtn.disabled = false; runBtn.textContent = 'Optimise All';
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
